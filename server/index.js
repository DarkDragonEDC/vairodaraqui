import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Or explicitly set your Netlify URL here
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Manual socket registry for Ticker reliability
const connectedSockets = new Map();

app.use(cors());
app.use(express.json());

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

// Public route
app.get('/', (req, res) => {
    res.send('Jogo 2.0 Server is running');
});

// Protected route example
app.get('/api/me', authMiddleware, (req, res) => {
    res.json({ user: req.user, message: "You are authenticated!" });
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

    socket.on('disconnect', (reason) => {
        console.log(`[SOCKET] User disconnected: ${socket.id}. Reason: ${reason}`);
        connectedSockets.delete(socket.id);
    });

    socket.on('get_status', async () => {
        try {
            await gameManager.executeLocked(socket.user.id, async () => {
                const status = await gameManager.getStatus(socket.user.id, true);
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
            socket.emit('status_update', await gameManager.getStatus(socket.user.id));
        } catch (err) {
            console.error(`[SERVER] Error creating character "${name}": `, err.message);
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('start_activity', async ({ actionType, itemId, quantity }) => {
        try {
            await gameManager.executeLocked(socket.user.id, async () => {
                const result = await gameManager.startActivity(socket.user.id, actionType, itemId, quantity);
                socket.emit('activity_started', result);
                socket.emit('status_update', await gameManager.getStatus(socket.user.id));
            });
        } catch (err) {
            console.error('Error starting activity:', err);
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('claim_reward', async () => {
        try {
            await gameManager.executeLocked(socket.user.id, async () => {
                const result = await gameManager.claimReward(socket.user.id);
                socket.emit('reward_claimed', result);
                socket.emit('status_update', await gameManager.getStatus(socket.user.id));
            });
        } catch (err) {
            console.error('Error claiming reward:', err);
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('start_dungeon', async ({ tier, dungeonId, repeatCount }) => {
        try {
            await gameManager.executeLocked(socket.user.id, async () => {
                const result = await gameManager.startDungeon(socket.user.id, dungeonId, repeatCount);
                socket.emit('dungeon_started', result);
                socket.emit('status_update', await gameManager.getStatus(socket.user.id));
            });
        } catch (err) {
            console.error('Error starting dungeon:', err);
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('stop_dungeon', async () => {
        try {
            await gameManager.executeLocked(socket.user.id, async () => {
                const result = await gameManager.stopDungeon(socket.user.id);
                socket.emit('dungeon_stopped', result);
                socket.emit('status_update', await gameManager.getStatus(socket.user.id));
            });
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('start_combat', async ({ tier, mobId }) => {
        try {
            await gameManager.executeLocked(socket.user.id, async () => {
                const result = await gameManager.startCombat(socket.user.id, mobId, tier);
                socket.emit('combat_started', result);
                socket.emit('status_update', await gameManager.getStatus(socket.user.id));
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
                const result = await gameManager.stopCombat(userId);
                socket.emit('action_result', result);
                const status = await gameManager.getStatus(userId);
                socket.emit('status_update', status);
            });
        } catch (err) {
            socket.emit('error', err.message);
        }
    });


    socket.on('equip_item', async ({ itemId }) => {
        try {
            await gameManager.executeLocked(socket.user.id, async () => {
                const result = await gameManager.equipItem(socket.user.id, itemId);
                socket.emit('item_equipped', result);
                socket.emit('status_update', await gameManager.getStatus(socket.user.id));
            });
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('unequip_item', async ({ slot }) => {
        try {
            await gameManager.executeLocked(socket.user.id, async () => {
                const result = await gameManager.unequipItem(socket.user.id, slot);
                socket.emit('item_unequipped', result);
                socket.emit('status_update', await gameManager.getStatus(socket.user.id));
            });
        } catch (err) {
            console.error('Error unequipping item:', err);
            socket.emit('error', { message: err.message });
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
            const char = await gameManager.getCharacter(socket.user.id);
            if (!char) return;

            const { data, error } = await supabase
                .from('combat_history')
                .select('*')
                .eq('character_id', char.id)
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
            const char = await gameManager.getCharacter(socket.user.id);
            if (!char) return;

            const { data, error } = await supabase
                .from('dungeon_history')
                .select('*')
                .eq('character_id', char.id)
                .order('occurred_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            socket.emit('dungeon_history_update', data);
        } catch (err) {
            console.error('Error fetching dungeon history:', err);
            socket.emit('error', { message: 'Failed to fetch dungeon history' });
        }
    });

    socket.on('send_message', async ({ content }) => {
        try {
            const char = await gameManager.getCharacter(socket.user.id);
            if (!char) return;
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
            socket.emit('error', { message: 'Erro ao enviar mensagem' });
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
                const result = await gameManager.listMarketItem(socket.user.id, itemId, amount, price);
                socket.emit('market_action_success', result);
                socket.emit('status_update', await gameManager.getStatus(socket.user.id));
                const listings = await gameManager.getMarketListings();
                io.emit('market_listings_update', listings);
            });
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('buy_market_item', async ({ listingId, quantity }) => {
        console.log(`[MARKET] Buy request from ${socket.user.email}: listingId=${listingId}, quantity=${quantity}`);
        try {
            await gameManager.executeLocked(socket.user.id, async () => {
                const result = await gameManager.buyMarketItem(socket.user.id, listingId, quantity);
                console.log(`[MARKET] Buy success for ${socket.user.email}:`, result.message);
                socket.emit('market_action_success', result);
                socket.emit('status_update', await gameManager.getStatus(socket.user.id));
                const listings = await gameManager.getMarketListings();
                io.emit('market_listings_update', listings);
            });
        } catch (err) {
            console.error(`[MARKET] Buy error for ${socket.user.email}:`, err.message);
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('cancel_listing', async ({ listingId }) => {
        try {
            await gameManager.executeLocked(socket.user.id, async () => {
                const result = await gameManager.cancelMarketListing(socket.user.id, listingId);
                socket.emit('market_action_success', result);
                socket.emit('status_update', await gameManager.getStatus(socket.user.id));
                const listings = await gameManager.getMarketListings();
                io.emit('market_listings_update', listings);
            });
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('claim_market_item', async ({ claimId }) => {
        try {
            await gameManager.executeLocked(socket.user.id, async () => {
                const result = await gameManager.claimMarketItem(socket.user.id, claimId);
                socket.emit('market_action_success', result);
                socket.emit('status_update', await gameManager.getStatus(socket.user.id));
            });
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('sell_item', async ({ itemId, quantity }) => {
        try {
            await gameManager.executeLocked(socket.user.id, async () => {
                const result = await gameManager.sellItem(socket.user.id, itemId, quantity);
                socket.emit('item_sold', result);
                socket.emit('status_update', await gameManager.getStatus(socket.user.id));
            });
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('stop_activity', async () => {
        try {
            await gameManager.executeLocked(socket.user.id, async () => {
                await gameManager.stopActivity(socket.user.id);
                socket.emit('activity_stopped');
                socket.emit('status_update', await gameManager.getStatus(socket.user.id));
            });
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('acknowledge_offline_report', async () => {
        try {
            await gameManager.clearOfflineReport(socket.user.id);
        } catch (err) {
            console.error('Error clearing offline report:', err);
        }
    });

    socket.on('mark_notification_read', async ({ notificationId }) => {
        try {
            await gameManager.executeLocked(socket.user.id, async () => {
                const char = await gameManager.getCharacter(socket.user.id);
                if (char && char.state.notifications) {
                    const notif = char.state.notifications.find(n => n.id === notificationId);
                    if (notif) {
                        notif.read = true;
                        await gameManager.saveState(socket.user.id, char.state);
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
                const char = await gameManager.getCharacter(socket.user.id);
                if (char && char.state.notifications) {
                    char.state.notifications = [];
                    await gameManager.saveState(socket.user.id, char.state);
                }
            });
        } catch (err) {
            console.error('Error clearing notifications:', err);
        }
    });
});

// --- GLOBAL TICKER LOOP (1s) ---
setInterval(async () => {
    try {
        const localSockets = Array.from(connectedSockets.values());
        const userGroups = {};

        localSockets.forEach(s => {
            const user = s.user || s.data?.user;
            if (user && user.id) {
                if (!userGroups[user.id]) userGroups[user.id] = { user, sockets: [] };
                userGroups[user.id].sockets.push(s);
            }
        });

        const activeUsersCount = Object.keys(userGroups).length;
        if (activeUsersCount > 0) {
            // console.log(`[TICKER] Processing ${ activeUsersCount } users...`);
        }

        await Promise.all(Object.values(userGroups).map(async ({ user, sockets }) => {
            try {
                await gameManager.executeLocked(user.id, async () => {
                    const result = await gameManager.processTick(user.id);
                    if (result) {
                        console.log(`[TICKER] Emitting update for ${user.email} (Status change: ${!!result.status})`);
                        sockets.forEach(s => {
                            // Fix: Emit if message OR combatUpdate OR dungeonUpdate exists
                            const shouldEmit = result.message || result.combatUpdate || (result.dungeonUpdate && result.dungeonUpdate.message) || result.healingUpdate;

                            if (shouldEmit) {
                                s.emit('action_result', {
                                    success: result.success,
                                    message: result.message || (result.combatUpdate?.details?.message) || (result.dungeonUpdate?.message),
                                    leveledUp: result.leveledUp,
                                    combatUpdate: result.combatUpdate,
                                    dungeonUpdate: result.dungeonUpdate,
                                    healingUpdate: result.healingUpdate
                                });
                            }
                            if (result.status) {
                                s.emit('status_update', result.status);
                            }
                            if (result.leveledUp) {
                                const { skill, level } = result.leveledUp;
                                const skillName = skill.replace(/_/g, ' ');
                                s.emit('skill_level_up', {
                                    message: `Sua skill de ${skillName} subiu para o nível ${level}!`
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

httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT} `);
});
