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
        origin: "*",
        methods: ["GET", "POST"]
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
        return next(new Error("Authentication error: No token provided"));
    }

    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
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
    console.log('User connected:', socket.user.email, '(' + socket.id + ')');
    connectedSockets.set(socket.id, socket);

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        connectedSockets.delete(socket.id);
    });

    socket.on('get_status', async () => {
        try {
            const status = await gameManager.getStatus(socket.user.id, true);
            socket.emit('status_update', status);
        } catch (err) {
            console.error(`[SERVER] Error in get_status:`, err);
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('get_leaderboard', async () => {
        try {
            const leaderboard = await gameManager.getLeaderboard();
            socket.emit('leaderboard_update', leaderboard);
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('create_character', async ({ name }) => {
        try {
            const char = await gameManager.createCharacter(socket.user.id, name);
            socket.emit('character_created', char);
            socket.emit('status_update', await gameManager.getStatus(socket.user.id));
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('start_activity', async ({ actionType, itemId, quantity }) => {
        try {
            const result = await gameManager.startActivity(socket.user.id, actionType, itemId, quantity);
            socket.emit('activity_started', result);
            socket.emit('status_update', await gameManager.getStatus(socket.user.id));
        } catch (err) {
            console.error('Error starting activity:', err);
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('claim_reward', async () => {
        try {
            const result = await gameManager.claimReward(socket.user.id);
            socket.emit('reward_claimed', result);
            socket.emit('status_update', await gameManager.getStatus(socket.user.id));
        } catch (err) {
            console.error('Error claiming reward:', err);
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('start_dungeon', async ({ tier }) => {
        try {
            const result = await gameManager.startDungeon(socket.user.id, tier);
            socket.emit('dungeon_started', result);
            socket.emit('status_update', await gameManager.getStatus(socket.user.id));
        } catch (err) {
            console.error('Error starting dungeon:', err);
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('start_combat', async ({ tier, mobId }) => {
        try {
            const result = await gameManager.startCombat(socket.user.id, mobId, tier);
            socket.emit('combat_started', result);
            socket.emit('status_update', await gameManager.getStatus(socket.user.id));
        } catch (err) {
            console.error('Error starting combat:', err);
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('stop_combat', async () => {
        try {
            const result = await gameManager.stopCombat(socket.user.id);
            socket.emit('combat_stopped', result);
            socket.emit('status_update', await gameManager.getStatus(socket.user.id));
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('equip_item', async ({ itemId }) => {
        try {
            const result = await gameManager.equipItem(socket.user.id, itemId);
            socket.emit('item_equipped', result);
            socket.emit('status_update', await gameManager.getStatus(socket.user.id));
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('unequip_item', async ({ slot }) => {
        try {
            const result = await gameManager.unequipItem(socket.user.id, slot);
            socket.emit('item_unequipped', result);
            socket.emit('status_update', await gameManager.getStatus(socket.user.id));
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
            const result = await gameManager.listMarketItem(socket.user.id, itemId, amount, price);
            socket.emit('market_action_success', result);
            socket.emit('status_update', await gameManager.getStatus(socket.user.id));
            const listings = await gameManager.getMarketListings();
            io.emit('market_listings_update', listings);
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('buy_market_item', async ({ listingId }) => {
        try {
            const result = await gameManager.buyMarketItem(socket.user.id, listingId);
            socket.emit('market_action_success', result);
            socket.emit('status_update', await gameManager.getStatus(socket.user.id));
            const listings = await gameManager.getMarketListings();
            io.emit('market_listings_update', listings);
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('cancel_listing', async ({ listingId }) => {
        try {
            const result = await gameManager.cancelMarketListing(socket.user.id, listingId);
            socket.emit('market_action_success', result);
            socket.emit('status_update', await gameManager.getStatus(socket.user.id));
            const listings = await gameManager.getMarketListings();
            io.emit('market_listings_update', listings);
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('claim_market_item', async ({ claimId }) => {
        try {
            const result = await gameManager.claimMarketItem(socket.user.id, claimId);
            socket.emit('market_action_success', result);
            socket.emit('status_update', await gameManager.getStatus(socket.user.id));
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('sell_item', async ({ itemId, quantity }) => {
        try {
            const result = await gameManager.sellItem(socket.user.id, itemId, quantity);
            socket.emit('item_sold', result);
            socket.emit('status_update', await gameManager.getStatus(socket.user.id));
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('stop_activity', async () => {
        try {
            await gameManager.stopActivity(socket.user.id);
            socket.emit('activity_stopped');
            socket.emit('status_update', await gameManager.getStatus(socket.user.id));
        } catch (err) {
            socket.emit('error', { message: err.message });
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
            // console.log(`[TICKER] Processing ${activeUsersCount} users...`);
        }

        await Promise.all(Object.values(userGroups).map(async ({ user, sockets }) => {
            try {
                const result = await gameManager.processTick(user.id);
                if (result) {
                    console.log(`[TICKER] Emitting update for ${user.email} (Status change: ${!!result.status})`);
                    sockets.forEach(s => {
                        if (result.message) {
                            s.emit('action_result', {
                                success: result.success,
                                message: result.message,
                                leveledUp: result.leveledUp
                            });
                        }
                        if (result.status) {
                            s.emit('status_update', result.status);
                        }
                        if (result.leveledUp) {
                            s.emit('skill_level_up', { message: `Sua skill subiu de nível!` });
                        }
                    });
                }
            } catch (err) {
                console.error(`[TICKER] Error for character ${user.id}:`, err);
            }
        }));
    } catch (err) {
        console.error("[TICKER] Error in global heartbeat loop:", err);
    }
}, 1000);

httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
