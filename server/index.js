import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import cors from 'cors';
import fs from 'fs';
import Stripe from 'stripe';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

process.on('unhandledRejection', (reason, promise) => {
    console.error('!!! Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('!!! Uncaught Exception:', err);
});


const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: ["http://localhost:5173", "http://127.0.0.1:5173", "https://vairodaraqui-fj1t.onrender.com"],
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling']
});

// Manual socket registry for Ticker reliability
const connectedSockets = new Map();

app.use(cors());

// Webhook must be BEFORE express.json() to get raw body
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_secret'
        );
    } catch (err) {
        console.error(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const { userId, characterId, crownAmount, packageId } = session.metadata;

        console.log(`[STRIPE] Payment confirmed for user ${userId}, character ${characterId}: ${crownAmount} Crowns`);

        try {
            await gameManager.executeLocked(userId, async () => {
                const char = await gameManager.getCharacter(userId, characterId);
                const result = gameManager.crownsManager.addCrowns(char, parseInt(crownAmount), `STRIPE_${packageId}`);

                if (result.success) {
                    await gameManager.saveState(char.id, char.state);

                    // Notify client if connected
                    const userSockets = Array.from(connectedSockets.values())
                        .filter(s => s.user?.id === userId);

                    userSockets.forEach(s => {
                        s.emit('crown_purchase_success', {
                            message: `Payment confirmed! Added ${crownAmount} Crowns.`,
                            newBalance: result.newBalance
                        });
                        // Also trigger a full status update
                        gameManager.getStatus(userId, true, characterId).then(status => {
                            s.emit('status_update', status);
                        });
                    });
                }
            });
        } catch (err) {
            console.error('[STRIPE] Error processing character update:', err);
            // Stripe will retry if we don't send 200, but we might want 200 if it's a logic error
        }
    }

    res.json({ received: true });
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

import { authMiddleware } from './authMiddleware.js';

const PORT = process.env.PORT || 3000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn("WARNING: Supabase credentials not found in .env");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const isServiceRole = SUPABASE_KEY?.includes('NlcnZpY2Vfcm9sZ');
console.log('[SERVER] Supabase Key Role:', isServiceRole ? 'SERVICE_ROLE' : 'ANON');

import { GameManager } from './GameManager.js';
const gameManager = new GameManager(supabase);

import { characterRoutes } from './routes/characters.js';
app.use('/api/characters', authMiddleware, characterRoutes(gameManager));

// Public route
app.get('/', (req, res) => {
    res.send('Jogo 2.0 Server is running');
});

// Protected route example
app.get('/api/me', authMiddleware, (req, res) => {
    res.json({ user: req.user, message: "You are authenticated!" });
});

// Update Last Active Timestamp
app.post('/api/update_last_active', authMiddleware, async (req, res) => {
    try {
        const { error } = await supabase
            .from('user_sessions')
            .upsert({ user_id: req.user.id, last_active_at: new Date().toISOString() });

        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        console.error('Error updating last_active:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get Last Active Timestamp
app.get('/api/last_active', authMiddleware, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('user_sessions')
            .select('last_active_at')
            .eq('user_id', req.user.id)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        res.json({ last_active_at: data?.last_active_at || null, server_time: new Date().toISOString() });
    } catch (err) {
        console.error('Error getting last_active:', err);
        res.status(500).json({ error: err.message });
    }
});

// Public route for active players count (characters with actions)
app.get('/api/active_players', async (req, res) => {
    // Log em arquivo para depuração persistente
    const logMsg = `[${new Date().toISOString()}] Contador acessado. Origin: ${req.headers.origin}\n`;
    try {
        if (!fs.existsSync('logs')) fs.mkdirSync('logs');
        fs.appendFileSync('logs/access.log', logMsg);
    } catch (e) { }

    // Forçar cabeçalhos CORS para evitar bloqueio do navegador local
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

    try {
        const { count, error } = await supabase
            .from('characters')
            .select('*', { count: 'exact', head: true })
            .or('current_activity.not.is.null,state->combat.not.is.null,state->dungeon.not.is.null');

        if (error) {
            console.error('[SERVER] Supabase error:', error.message);
            throw error;
        }

        res.json({ count: count || 0 });
    } catch (err) {
        console.error('[SERVER] Error:', err);
        res.status(500).json({ count: 0, error: err.message });
    }
});

io.use(async (socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

    if (!token) {
        console.warn(`[SOCKET AUTH] No token provided for socket: ${socket.id}`);
        return next(new Error("Authentication error: No token provided"));
    }

    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            console.error(`[SOCKET AUTH] Invalid token for socket: ${socket.id}`, error?.message);
            return next(new Error("Authentication error: Invalid token"));
        }

        socket.user = user;
        socket.data.user = user;
        next();
    } catch (err) {
        return next(new Error("Authentication error: " + err.message));
    }
});

io.on('connection', (socket) => {
    console.log(`[SOCKET] User connected: ${socket.user?.email || 'Unknown'} (Socket: ${socket.id})`);
    connectedSockets.set(socket.id, socket);

    socket.on('disconnect', async (reason) => {
        console.log(`[SOCKET] User disconnected: ${socket.id}. Reason: ${reason}`);
        connectedSockets.delete(socket.id);

        const charId = socket.data.characterId;
        if (charId) {
            try {
                // Save immediately on disconnect to prevent rollback
                await gameManager.persistCharacter(charId);
                // Clear cache so next login starts fresh from DB (important for manual edits)
                gameManager.removeFromCache(charId);
                console.log(`[SOCKET] Char ${charId} persisted and cleared from cache on disconnect.`);
            } catch (err) {
                console.error(`[SOCKET] Error persisting char ${charId} on disconnect:`, err);
            }
        }
    });

    socket.on('join_character', async ({ characterId }) => {
        if (!characterId) return;
        const userId = socket.user.id;

        socket.join(`user:${userId}`);
        socket.data.characterId = characterId;

        console.log(`[SOCKET] User ${socket.user.email} joined character ${characterId}`);

        try {
            // Note: Removed syncWithDatabase here - it was preventing catchup from working
            // because it populated cache with old DB data BEFORE getStatus could run catchup.
            // The getStatus with bypassCache=true handles fresh loading properly.

            // Immediately send status for this character (with catchup=true for offline progress)
            await gameManager.executeLocked(userId, async () => {
                const status = await gameManager.getStatus(socket.user.id, true, characterId, true);
                socket.emit('status_update', status);
            });
        } catch (err) {
            console.error(`[SOCKET] Error joining character ${characterId}:`, err);
            socket.emit('error', { message: "Failed to load character data." });
        }
    });

    socket.on('get_status', async () => {
        try {
            const charId = socket.data.characterId;
            await gameManager.executeLocked(socket.user.id, async () => {
                const status = await gameManager.getStatus(socket.user.id, true, charId, true);
                socket.emit('status_update', status);
            });
        } catch (err) {
            console.error(`[SERVER] Error in get_status: `, err);
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('get_leaderboard', async (type) => {
        try {
            const leaderboard = await gameManager.getLeaderboard(type);
            socket.emit('leaderboard_update', { type, data: leaderboard });
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('create_character', async ({ name }) => {
        console.log(`[SERVER] Received create_character request: "${name}" from user ${socket.user.email} `);
        try {
            const char = await gameManager.createCharacter(socket.user.id, name);
            console.log(`[SERVER] Character created successfully: "${name}"`);
            socket.emit('character_created', char);
            socket.emit('status_update', await gameManager.getStatus(socket.user.id, true, char.id));
        } catch (err) {
            console.error(`[SERVER] Error creating character "${name}": `, err.message);
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('start_activity', async ({ actionType, itemId, quantity }) => {
        try {
            await gameManager.executeLocked(socket.user.id, async () => {
                const result = await gameManager.startActivity(socket.user.id, socket.data.characterId, actionType, itemId, quantity);
                socket.emit('activity_started', result);
                socket.emit('status_update', await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
            });
        } catch (err) {
            console.error('Error starting activity:', err);
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('claim_reward', async () => {
        try {
            await gameManager.executeLocked(socket.user.id, async () => {
                const result = await gameManager.claimReward(socket.user.id, socket.data.characterId);
                socket.emit('reward_claimed', result);
                socket.emit('status_update', await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
            });
        } catch (err) {
            console.error('Error claiming reward:', err);
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('start_dungeon', async ({ tier, dungeonId, repeatCount }) => {
        try {
            await gameManager.executeLocked(socket.user.id, async () => {
                const result = await gameManager.startDungeon(socket.user.id, socket.data.characterId, dungeonId, repeatCount);
                socket.emit('dungeon_started', result);
                socket.emit('status_update', await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
            });
        } catch (err) {
            console.error('Error starting dungeon:', err);
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('stop_dungeon', async () => {
        try {
            await gameManager.executeLocked(socket.user.id, async () => {
                const result = await gameManager.stopDungeon(socket.user.id, socket.data.characterId);
                socket.emit('dungeon_stopped', result);
                socket.emit('status_update', await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
            });
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('start_combat', async ({ tier, mobId }) => {
        try {
            await gameManager.executeLocked(socket.user.id, async () => {
                const result = await gameManager.startCombat(socket.user.id, socket.data.characterId, mobId, tier);
                socket.emit('combat_started', result);
                socket.emit('status_update', await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
            });
        } catch (err) {
            console.error('Error starting combat:', err);
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('stop_combat', async () => {
        try {
            await gameManager.executeLocked(socket.user.id, async () => {
                const userId = socket.user.id;
                const result = await gameManager.stopCombat(userId, socket.data.characterId);
                socket.emit('action_result', result);
                const status = await gameManager.getStatus(userId, true, socket.data.characterId);
                socket.emit('status_update', status);
            });
        } catch (err) {
            socket.emit('error', err.message);
        }
    });


    socket.on('equip_item', async ({ itemId }) => {
        try {
            await gameManager.executeLocked(socket.user.id, async () => {
                const result = await gameManager.equipItem(socket.user.id, socket.data.characterId, itemId);
                socket.emit('item_equipped', result);
                socket.emit('status_update', await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
            });
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('unequip_item', async ({ slot }) => {
        try {
            await gameManager.executeLocked(socket.user.id, async () => {
                const result = await gameManager.unequipItem(socket.user.id, socket.data.characterId, slot);
                socket.emit('item_unequipped', result);
                socket.emit('status_update', await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
            });
        } catch (err) {
            console.error('Error unequipping item:', err);
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('sell_item', async ({ itemId, quantity }) => {
        try {
            await gameManager.executeLocked(socket.user.id, async () => {
                const result = await gameManager.sellItem(socket.user.id, socket.data.characterId, itemId, quantity);
                socket.emit('item_sold', result);
                socket.emit('status_update', await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
            });
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('use_item', async ({ itemId, quantity = 1 }) => {
        console.log(`[DEBUG-SOCKET] Received use_item for ${itemId}`);
        try {
            await gameManager.executeLocked(socket.user.id, async () => {
                const result = await gameManager.consumeItem(socket.user.id, socket.data.characterId, itemId, quantity);
                socket.emit('item_used', result);
                socket.emit('status_update', await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
            });
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('stop_activity', async () => {
        try {
            await gameManager.executeLocked(socket.user.id, async () => {
                await gameManager.stopActivity(socket.user.id, socket.data.characterId);
                socket.emit('activity_stopped');
                socket.emit('status_update', await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
            });
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('get_market_listings', async (filters) => {
        try {
            const listings = await gameManager.getMarketListings(filters);
            socket.emit('market_listings_update', listings);
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('list_market_item', async ({ itemId, amount, price }) => {
        try {
            await gameManager.executeLocked(socket.user.id, async () => {
                const result = await gameManager.listMarketItem(socket.user.id, socket.data.characterId, itemId, amount, price);
                socket.emit('market_action_success', result);
                socket.emit('status_update', await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
                // Broadcast update to all
                const listings = await gameManager.getMarketListings();
                io.emit('market_listings_update', listings);
            });
        } catch (err) {
            socket.emit('error', { message: err.message });
            try {
                socket.emit('status_update', await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
            } catch (e) { }
        }
    });

    socket.on('buy_market_item', async ({ listingId, quantity }) => {
        try {
            await gameManager.executeLocked(socket.user.id, async () => {
                const result = await gameManager.buyMarketItem(socket.user.id, socket.data.characterId, listingId, quantity);
                socket.emit('market_action_success', result);
                socket.emit('status_update', await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
                // Broadcast update to all
                const listings = await gameManager.getMarketListings();
                io.emit('market_listings_update', listings);
            });
        } catch (err) {
            console.error("Buy Error:", err);
            socket.emit('error', { message: err.message });
            try {
                socket.emit('status_update', await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
            } catch (e) { }
        }
    });

    socket.on('cancel_listing', async ({ listingId }) => {
        try {
            await gameManager.executeLocked(socket.user.id, async () => {
                const result = await gameManager.cancelMarketListing(socket.user.id, socket.data.characterId, listingId);
                socket.emit('market_action_success', result);
                socket.emit('status_update', await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
                // Broadcast update to all
                const listings = await gameManager.getMarketListings();
                io.emit('market_listings_update', listings);
            });
        } catch (err) {
            socket.emit('error', { message: err.message });
            try {
                socket.emit('status_update', await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
            } catch (e) { }
        }
    });

    socket.on('claim_market_item', async ({ claimId }) => {
        try {
            await gameManager.executeLocked(socket.user.id, async () => {
                const result = await gameManager.claimMarketItem(socket.user.id, socket.data.characterId, claimId);
                socket.emit('market_action_success', result);
                socket.emit('status_update', await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
            });
        } catch (err) {
            socket.emit('error', { message: err.message });
            try {
                socket.emit('status_update', await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
            } catch (e) { }
        }
    });

    socket.on('get_chat_history', async () => {
        try {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);
            if (error) throw error;
            socket.emit('chat_history', data.reverse());
        } catch (err) {
            console.error('Error fetching chat history:', err);
        }
    });

    socket.on('get_combat_history', async () => {
        try {
            // Fix: Fetch history for the SELECTED character
            const charId = socket.data.characterId;
            if (!charId) return;

            const { data, error } = await supabase
                .from('combat_history')
                .select('*')
                .eq('character_id', charId)
                .order('occurred_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            socket.emit('combat_history_update', data);
        } catch (err) {
            console.error('Error fetching combat history:', err);
            socket.emit('error', { message: 'Failed to fetch combat history' });
        }
    });

    socket.on('get_dungeon_history', async () => {
        try {
            // Fix: Fetch history for the SELECTED character
            const charId = socket.data.characterId;
            if (!charId) return;

            const { data, error } = await supabase
                .from('dungeon_history')
                .select('*')
                .eq('character_id', charId)
                .order('occurred_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            socket.emit('dungeon_history_update', data);
        } catch (err) {
            console.error('Error fetching dungeon history:', err);
            socket.emit('error', { message: `Failed to fetch dungeon history: ${err.message}` });
        }
    });


    socket.on('send_message', async ({ content }) => {
        try {
            // Cooldown Check (10s)
            const lastChat = socket.data.lastChatTime || 0;
            const now = Date.now();
            if (now - lastChat < 10000) {
                const remaining = Math.ceil((10000 - (now - lastChat)) / 1000);
                socket.emit('error', { message: `Chat cooldown: Wait ${remaining}s` });
                return;
            }

            const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
            if (!char) return;

            socket.data.lastChatTime = now;

            // Enforce character limit
            if (content.length > 100) {
                content = content.substring(0, 100);
            }

            const { data, error } = await supabase
                .from('messages')
                .insert({
                    user_id: socket.user.id,
                    sender_name: char.name,
                    content: content
                })
                .select()
                .single();
            if (error) throw error;
            io.emit('new_message', data);
        } catch (err) {
            console.error('Error sending message:', err);
            socket.emit('error', { message: 'Error sending message' });
        }
    });



    socket.on('acknowledge_offline_report', async () => {
        try {
            await gameManager.clearOfflineReport(socket.user.id, socket.data.characterId);
        } catch (err) {
            console.error('Error clearing offline report:', err);
        }
    });

    socket.on('mark_notification_read', async ({ notificationId }) => {
        try {
            await gameManager.executeLocked(socket.user.id, async () => {
                const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
                if (char && char.state.notifications) {
                    const notif = char.state.notifications.find(n => n.id === notificationId);
                    if (notif) {
                        notif.read = true;
                        await gameManager.saveState(char.id, char.state);
                    }
                }
            });
        } catch (err) {
            console.error('Error marking notification as read:', err);
        }
    });

    socket.on('clear_notifications', async () => {
        try {
            await gameManager.executeLocked(socket.user.id, async () => {
                const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
                if (char && char.state.notifications) {
                    char.state.notifications = [];
                    await gameManager.saveState(char.id, char.state);
                }
            });
        } catch (err) {
            console.error('Error clearing notifications:', err);
        }
    });

    // ===== CROWN STORE EVENTS =====

    // Get crown store items
    socket.on('get_crown_store', async () => {
        try {
            const { getAllStoreItems } = await import('../shared/crownStore.js');
            socket.emit('crown_store_update', getAllStoreItems());
        } catch (err) {
            console.error('Error getting crown store:', err);
            socket.emit('error', { message: err.message });
        }
    });

    // Purchase item with crowns
    socket.on('purchase_crown_item', async ({ itemId }) => {
        try {
            await gameManager.executeLocked(socket.user.id, async () => {
                const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
                const result = await gameManager.crownsManager.purchaseItem(char, itemId);

                if (result.success) {
                    await gameManager.saveState(char.id, char.state);
                    socket.emit('crown_purchase_success', result);
                } else {
                    socket.emit('crown_purchase_error', result);
                }

                socket.emit('status_update', await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
            });
        } catch (err) {
            console.error('Error purchasing crown item:', err);
            socket.emit('error', { message: err.message });
        }
    });

    // Buy crowns (real money package)
    socket.on('buy_crown_package', async ({ packageId }) => {
        try {
            await gameManager.executeLocked(socket.user.id, async () => {
                const { CROWN_STORE } = await import('../shared/crownStore.js');
                const pkg = CROWN_STORE.PACKAGES[packageId];

                if (!pkg) {
                    return socket.emit('crown_purchase_error', { error: 'Package not found' });
                }

                const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
                const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

                // Create Stripe Checkout Session
                const session = await stripe.checkout.sessions.create({
                    payment_method_types: ['card'],
                    line_items: [{
                        price_data: {
                            currency: pkg.currency.toLowerCase(),
                            product_data: {
                                name: pkg.name,
                                description: pkg.description,
                                images: ['https://raw.githubusercontent.com/lucide-react/lucide/main/icons/crown.svg'],
                            },
                            unit_amount: Math.round(pkg.price * 100), // Stripe uses cents
                        },
                        quantity: 1,
                    }],
                    mode: 'payment',
                    success_url: `${CLIENT_URL}/?payment=success&package=${packageId}`,
                    cancel_url: `${CLIENT_URL}/?payment=cancel`,
                    metadata: {
                        userId: socket.user.id,
                        characterId: socket.data.characterId,
                        packageId: packageId,
                        crownAmount: pkg.amount
                    }
                });

                socket.emit('stripe_checkout_session', { url: session.url });
            });
        } catch (err) {
            console.error('Error creating checkout session:', err);
            socket.emit('crown_purchase_error', { error: 'Failed to initiate payment' });
        }
    });

    // Get crown balance
    socket.on('get_crown_balance', async () => {
        try {
            const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
            const balance = gameManager.crownsManager.getCrowns(char);
            socket.emit('crown_balance_update', { crowns: balance });
        } catch (err) {
            console.error('Error getting crown balance:', err);
            socket.emit('error', { message: err.message });
        }
    });

    // ADMIN: Add crowns (for testing - should be protected in production)
    socket.on('admin_add_crowns', async ({ amount }) => {
        try {
            // TODO: Add admin check in production
            await gameManager.executeLocked(socket.user.id, async () => {
                const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
                const result = gameManager.crownsManager.addCrowns(char, amount, 'ADMIN');

                if (result.success) {
                    await gameManager.saveState(char.id, char.state);
                    socket.emit('crown_balance_update', { crowns: result.newBalance });
                }

                socket.emit('status_update', await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
            });
        } catch (err) {
            console.error('Error adding crowns:', err);
            socket.emit('error', { message: err.message });
        }
    });
});

// --- GLOBAL TICKER LOOP (1s) ---
setInterval(async () => {
    try {
        const localSockets = Array.from(connectedSockets.values());
        const charGroups = {};

        localSockets.forEach(s => {
            const user = s.user || s.data?.user;
            const charId = s.data?.characterId;
            if (user && user.id && charId) {
                const key = `${user.id}:${charId}`;
                if (!charGroups[key]) charGroups[key] = { user, charId, sockets: [] };
                charGroups[key].sockets.push(s);
            }
        });

        const activeCharsCount = Object.keys(charGroups).length;
        // console.log(`[TICKER] Sockets: ${localSockets.length}, Characters: ${activeCharsCount}`);

        await Promise.all(Object.values(charGroups).map(async ({ user, charId, sockets }) => {
            try {
                // Skip if already locked (prevent queue accumulation)
                if (gameManager.isLocked(user.id)) {
                    // console.log(`[TICKER] Skipping user ${user.email} (task pending)`);
                    return;
                }

                await gameManager.executeLocked(user.id, async () => {
                    const result = await gameManager.processTick(user.id, charId);
                    if (result) {
                        // console.log(`[TICKER] Emitting update for ${user.email} (Status change: ${!!result.status})`);
                        sockets.forEach(s => {
                            // Fix: Emit if message OR combatUpdate OR dungeonUpdate exists
                            const shouldEmit = result.message || result.combatUpdate || (result.dungeonUpdate && result.dungeonUpdate.message) || result.healingUpdate;

                            if (shouldEmit) {
                                try {
                                    s.emit('action_result', {
                                        success: result.success,
                                        message: result.message || (result.combatUpdate?.details?.message) || (result.dungeonUpdate?.message),
                                        leveledUp: result.leveledUp,
                                        combatUpdate: result.combatUpdate,
                                        dungeonUpdate: result.dungeonUpdate,
                                        healingUpdate: result.healingUpdate
                                    });
                                } catch (e) { console.error("[EMIT-ERROR] action_result failed:", e); }
                            }
                            if (result.status) {
                                try {
                                    s.emit('status_update', result.status);
                                } catch (e) { console.error("[EMIT-ERROR] status_update failed:", e); }
                            }
                            if (result.leveledUp) {
                                const { skill, level } = result.leveledUp;
                                const skillName = skill.replace(/_/g, ' ');
                                s.emit('skill_level_up', {
                                    message: `Your ${skillName} skill raised to level ${level}!`
                                });
                            }
                        });
                    }
                });
            } catch (err) {
                console.error(`[TICKER] Error for character ${user.id}: `, err);
            }
        }));
    } catch (err) {
        console.error("[TICKER] Error in global heartbeat loop:", err);
    }
}, 1000);

// --- Background Maintenance (10 mins) ---
setInterval(async () => {
    try {
        await gameManager.runMaintenance();
    } catch (err) {
        console.error('[MAINTENANCE-LOOP] Error:', err);
    }
}, 600000);

// --- Background Sync (1 min) ---
setInterval(async () => {
    try {
        await gameManager.persistAllDirty();
    } catch (err) {
        console.error('[SYNC-LOOP] Error:', err);
    }
}, 60000);

// Run once on startup
setTimeout(() => {
    gameManager.runMaintenance();
}, 5000);

httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT} (0.0.0.0)`);
});
