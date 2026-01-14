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
        origin: "*", // Allow all for dev
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

import { authMiddleware } from './authMiddleware.js';

const PORT = process.env.PORT || 3000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY; // Should be SERVICE_ROLE_KEY

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
        next();
    } catch (err) {
        return next(new Error("Authentication error: " + err.message));
    }
});

io.on('connection', (socket) => {
    console.log('User connected:', socket.user.email, '(' + socket.id + ')');

    socket.on('get_status', async () => {
        try {
            console.log(`[DEBUG] get_status for user: ${socket.user.id} (${socket.user.email})`);
            const char = await gameManager.getCharacter(socket.user.id);
            if (!char) {
                console.log(`[DEBUG] No character found for user: ${socket.user.id}`);
                socket.emit('status_update', { noCharacter: true });
                return;
            }
            console.log(`[DEBUG] Character found: ${char.name}`);
            const status = await gameManager.getStatus(socket.user.id);
            socket.emit('status_update', status);
        } catch (err) {
            console.error(`[DEBUG] Error in get_status:`, err);
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
            // Suporte para ambos os nomes de parâmetros por compatibilidade client/server
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

    // --- MARKET SOCKETS ---
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

            // Broadcast update for everyone
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

            // Broadcast update for everyone
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

            // Broadcast update for everyone
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

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// --- LOOP GLOBAL DE TRABALHO (TICKS) ---
// Processa atividades de todos os usuários conectados a cada 3 segundos
setInterval(async () => {
    const sockets = await io.fetchSockets();
    for (const s of sockets) {
        if (s.user) {
            try {
                const result = await gameManager.processTick(s.user.id);
                if (result) {
                    // Se houve ganho, envia atualização para o cliente
                    console.log(`Tick for ${s.user.email}:`, result.message);
                    s.emit('action_result', result);
                    s.emit('status_update', await gameManager.getStatus(s.user.id));

                    if (result.leveledUp) {
                        s.emit('skill_level_up', { message: `Sua skill subiu de nível!` });
                    }
                }
            } catch (err) {
                console.error(`Error processing tick for ${s.user.id}:`, err);
            }
        }
    }
}, 3000); // 3 segundos por tick


httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
