import { ITEMS } from '../shared/items.js';
import { INITIAL_SKILLS, calculateNextLevelXP } from '../shared/skills.js';
import { InventoryManager } from './managers/InventoryManager.js';
import { ActivityManager } from './managers/ActivityManager.js';
import { CombatManager } from './managers/CombatManager.js';
import { MarketManager } from './managers/MarketManager.js';
import { DungeonManager } from './managers/DungeonManager.js';

const ITEM_LOOKUP = {};
const flattenItems = (obj) => {
    for (const key in obj) {
        if (obj[key] && obj[key].id) {
            ITEM_LOOKUP[obj[key].id] = obj[key];
        } else if (typeof obj[key] === 'object') {
            flattenItems(obj[key]);
        }
    }
};
flattenItems(ITEMS);

export class GameManager {
    constructor(supabase) {
        this.supabase = supabase;
        this.inventoryManager = new InventoryManager(this);
        this.activityManager = new ActivityManager(this);
        this.combatManager = new CombatManager(this);
        this.marketManager = new MarketManager(this);
        this.dungeonManager = new DungeonManager(this);
        this.userLocks = new Map(); // userId -> Promise (current task)
    }

    async executeLocked(userId, task) {
        if (!userId) return await task();

        // Obtém a trava atual para este usuário (ou uma Promise resolvida se não houver)
        const currentLock = this.userLocks.get(userId) || Promise.resolve();

        // Cria a próxima trava que aguarda a anterior
        const nextLock = currentLock.then(async () => {
            try {
                return await task();
            } catch (err) {
                console.error(`[LOCK] Error executing task for user ${userId}:`, err);
                throw err;
            }
        }).finally(() => {
            // Se esta for a última trava na fila, limpa o Map
            if (this.userLocks.get(userId) === nextLock) {
                this.userLocks.delete(userId);
            }
        });

        this.userLocks.set(userId, nextLock);
        return nextLock;
    }

    async getCharacter(userId, catchup = false) {
        const { data, error } = await this.supabase
            .from('characters')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (data && data.state) {
            let updated = false;

            if (!data.state.skills) {
                data.state.skills = { ...INITIAL_SKILLS };
                updated = true;
            } else {
                for (const skillKey in INITIAL_SKILLS) {
                    if (!data.state.skills[skillKey]) {
                        data.state.skills[skillKey] = { ...INITIAL_SKILLS[skillKey] };
                        updated = true;
                    }
                }
            }

            if (!data.state.stats) {
                data.state.stats = { str: 0, agi: 0, int: 0 };
                updated = true;
            }

            if (!data.state.notifications) {
                data.state.notifications = [];
                updated = true;
            }

            if (catchup && data.current_activity && data.activity_started_at) {
                const now = new Date();
                const lastSaved = data.last_saved ? new Date(data.last_saved).getTime() : new Date(data.activity_started_at).getTime();
                const elapsedSeconds = (now.getTime() - lastSaved) / 1000;
                const timePerAction = data.current_activity.time_per_action || 3;

                if (elapsedSeconds >= timePerAction) {
                    const actionsPossible = Math.floor(elapsedSeconds / timePerAction);
                    const actionsToProcess = Math.min(actionsPossible, data.current_activity.actions_remaining);

                    if (actionsToProcess > 0) {
                        const offlineReport = await this.processBatchActions(data, actionsToProcess);
                        // Only show offline report if significantly offline (e.g. > 30 seconds)
                        // This prevents the modal from popping up during normal heartbeat/lag spikes
                        if (offlineReport.totalTime > 30) {
                            data.offlineReport = offlineReport;
                        }
                        updated = true;
                        data.last_saved = now.toISOString();
                    }
                }
            }

            if (updated) {
                await this.supabase
                    .from('characters')
                    .update({
                        state: data.state,
                        current_activity: data.current_activity,
                        activity_started_at: data.activity_started_at,
                        last_saved: new Date().toISOString()
                    })
                    .eq('id', data.id);
            }
        }
        return data;
    }

    async processBatchActions(char, quantity) {
        const { type } = char.current_activity;
        const item = ITEM_LOOKUP[char.current_activity.item_id];
        if (!item) return { processed: 0, itemsGained: {}, xpGained: {} };

        let processed = 0;
        let leveledUp = false;
        const itemsGained = {};
        const xpGained = {};

        for (let i = 0; i < quantity; i++) {
            let result = null;
            switch (type) {
                case 'GATHERING': result = await this.activityManager.processGathering(char, item); break;
                case 'REFINING': result = await this.activityManager.processRefining(char, item); break;
                case 'CRAFTING': result = await this.activityManager.processCrafting(char, item); break;
            }

            if (result && !result.error) {
                processed++;
                if (result.leveledUp) leveledUp = true;
                if (result.itemGained) {
                    itemsGained[result.itemGained] = (itemsGained[result.itemGained] || 0) + (result.amountGained || 1);
                }
                if (result.xpGained) {
                    const stats = this.inventoryManager.calculateStats(char);
                    const xpBonus = stats.globals?.xpYield || 0;
                    const finalXp = Math.floor(result.xpGained * (1 + xpBonus / 100));
                    xpGained[result.skillKey] = (xpGained[result.skillKey] || 0) + finalXp;
                }
            } else {
                break;
            }
        }

        if (processed > 0) {
            char.current_activity.actions_remaining -= processed;
            if (char.current_activity.actions_remaining <= 0) {
                char.current_activity = null;
                char.activity_started_at = null;
            }
        }
        return { processed, leveledUp, itemsGained, xpGained, totalTime: processed * (char.current_activity?.time_per_action || 3) };
    }

    async createCharacter(userId, name) {
        const existing = await this.getCharacter(userId);
        if (existing) throw new Error("You already have a character");

        const initialState = {
            inventory: {},
            skills: { ...INITIAL_SKILLS },
            stats: { str: 0, agi: 0, int: 0 },
            silver: 0,
            notifications: []
        };

        // Calculate initial stats (HP) based on skills
        const tempChar = { state: initialState };
        const stats = this.inventoryManager.calculateStats(tempChar);

        initialState.health = stats.maxHP || 100;
        initialState.maxHealth = stats.maxHP || 100;

        const { data, error } = await this.supabase
            .from('characters')
            .insert({
                id: userId,
                user_id: userId,
                name: name,
                state: initialState
            })
            .select()
            .single();

        if (error) throw new Error(error.message || 'Error creating character');
        return data;
    }

    async getStatus(userId, catchup = false) {
        const char = await this.getCharacter(userId, catchup);
        if (!char) return { noCharacter: true };

        const stats = this.inventoryManager.calculateStats(char);

        const status = {
            user_id: char.id,
            name: char.name,
            state: char.state,
            calculatedStats: stats,
            current_activity: char.current_activity,
            activity_started_at: char.activity_started_at,
            dungeon_state: char.dungeon_state,
            offlineReport: char.offlineReport,
            serverTime: Date.now()
        };

        // Clear report from memory after it's been included in status once
        // (Wait, better but not enough if the client hasn't received it yet)
        // Let's stick to the explicit acknowledgment plan.
        return status;
    }

    async clearOfflineReport(userId) {
        const char = await this.getCharacter(userId);
        if (char) {
            char.offlineReport = null;
        }
    }

    async processTick(userId) {
        const char = await this.getCharacter(userId);
        if (!char) return null;

        const foodResult = this.processFood(char);
        const foodUsed = foodResult.used;

        if (!char.current_activity && !char.state.combat && !foodUsed && !char.state.dungeon) return null;

        const now = Date.now();
        let leveledUp = null;
        let itemsGained = 0;
        let lastActivityResult = null;
        let combatResult = null;
        let activityFinished = false;

        if (char.current_activity) {
            const { type, item_id, actions_remaining, time_per_action = 3, next_action_at } = char.current_activity;
            let targetTime = Number(next_action_at);
            if (!targetTime) {
                targetTime = now + (time_per_action * 1000);
                char.current_activity.next_action_at = targetTime;
            }

            if (now >= targetTime) {
                const item = ITEM_LOOKUP[item_id];
                if (item && actions_remaining > 0) {
                    let result = null;
                    const normalizedType = type.toUpperCase();
                    switch (normalizedType) {
                        case 'GATHERING': result = await this.activityManager.processGathering(char, item); break;
                        case 'REFINING': result = await this.activityManager.processRefining(char, item); break;
                        case 'CRAFTING': result = await this.activityManager.processCrafting(char, item); break;
                    }

                    char.current_activity.next_action_at = targetTime + (time_per_action * 1000);
                    if (now - char.current_activity.next_action_at > 5000) {
                        char.current_activity.next_action_at = now + (time_per_action * 1000);
                    }

                    if (result && !result.error) {
                        itemsGained++;
                        if (result.leveledUp) leveledUp = result.leveledUp;
                        lastActivityResult = result;
                        const newActionsRemaining = actions_remaining - 1;
                        activityFinished = newActionsRemaining <= 0;
                        if (activityFinished) {
                            char.current_activity = null;
                            char.activity_started_at = null;
                        } else {
                            char.current_activity.actions_remaining = newActionsRemaining;
                        }
                    } else {
                        lastActivityResult = result;
                        char.current_activity = null;
                    }
                }
            }
        }

        if (leveledUp) {
            const skillName = leveledUp.skill.replace(/_/g, ' ');
            this.addNotification(char, 'LEVEL_UP', `Sua skill de ${skillName} subiu para o nível ${leveledUp.level}!`);
        }

        let stateChanged = false;

        if (char.state.combat) {
            const combat = char.state.combat;
            const nextAttack = Number(combat.next_attack_at) || 0;

            if (!nextAttack || nextAttack === 0) {
                console.log(`[COMBAT] Initializing timer for ${char.name}`);
                combat.next_attack_at = now + 1000;
                stateChanged = true;
            } else if (now >= nextAttack) {
                // ... combat logic ...
                try {
                    combatResult = await this.combatManager.processCombatRound(char);
                    if (combatResult?.leveledUp) {
                        leveledUp = combatResult.leveledUp;
                    }
                } catch (e) {
                    console.error(`[COMBAT_ERROR] Error in processCombatRound for ${char.name}:`, e);
                }

                if (char.state.combat) {
                    const stats = this.inventoryManager.calculateStats(char);
                    const atkSpeed = Number(stats.attackSpeed) || 1000;
                    char.state.combat.next_attack_at = now + atkSpeed;
                    stateChanged = true;
                }
            } else {
                // Check for stuck timer (if next attack is too far in future > 5s)
                if (nextAttack > now + 5000) {
                    console.log(`[COMBAT_FIX] Timer stuck in future for ${char.name}. Resetting. (Now: ${now}, Next: ${nextAttack})`);
                    combat.next_attack_at = now;
                    stateChanged = true;
                }
            }
        }

        let dungeonResult = null;
        if (char.state.dungeon) {
            try {
                dungeonResult = await this.dungeonManager.processDungeonTick(char);
                if (dungeonResult) {
                    stateChanged = true;
                    // Merge update into state so it's visible in getStatus
                    if (dungeonResult.dungeonUpdate) {
                        Object.assign(char.state.dungeon, dungeonResult.dungeonUpdate);
                    }
                    if (dungeonResult.leveledUp) {
                        leveledUp = dungeonResult.leveledUp;
                    }
                }
            } catch (e) {
                console.error("Dungeon Error:", e);
            }
        }

        if (itemsGained > 0 || combatResult || foodUsed || activityFinished || stateChanged || dungeonResult) {
            await this.supabase
                .from('characters')
                .update({
                    state: char.state,
                    current_activity: char.current_activity,
                    activity_started_at: char.activity_started_at,
                    last_saved: new Date().toISOString()
                })
                .eq('id', char.id);
        }

        if (char.current_activity || char.state.combat || itemsGained > 0 || combatResult || dungeonResult) {
            return {
                success: true,
                message: lastActivityResult?.message || combatResult?.message || dungeonResult?.dungeonUpdate?.message || (foodUsed ? "Food consumed" : ""),
                leveledUp,
                activityFinished,
                combatUpdate: combatResult,
                dungeonUpdate: dungeonResult?.dungeonUpdate,
                healingUpdate: foodUsed ? { amount: foodResult.amount, source: 'FOOD' } : null,
                status: {
                    user_id: char.user_id,
                    name: char.name,
                    state: char.state,
                    calculatedStats: this.inventoryManager.calculateStats(char),
                    current_activity: char.current_activity,
                    activity_started_at: char.activity_started_at,
                    dungeon_state: char.state.dungeon,
                    serverTime: Date.now()
                }
            };
        }
        return lastActivityResult || combatResult;
    }

    addXP(char, skillKey, amount) {
        if (!skillKey || !char.state.skills[skillKey]) return null;
        const skill = char.state.skills[skillKey];
        skill.xp += amount;
        let leveledUp = false;
        let nextLevelXP = calculateNextLevelXP(skill.level);
        // Loop while we have enough XP and haven't hit the cap
        while (skill.xp >= nextLevelXP && skill.level < 100) {
            skill.level++;
            skill.xp -= nextLevelXP;
            leveledUp = true;
            nextLevelXP = calculateNextLevelXP(skill.level);
        }
        return leveledUp ? { skill: skillKey, level: skill.level } : null;
    }

    async saveState(charId, state) {
        const { error } = await this.supabase
            .from('characters')
            .update({ state })
            .eq('id', charId);
        if (error) throw error;
    }

    addNotification(char, type, message) {
        if (!char.state.notifications) char.state.notifications = [];
        char.state.notifications.unshift({
            id: Date.now() + Math.random(),
            type,
            message,
            timestamp: Date.now(),
            read: false
        });
        // Keep only last 50
        if (char.state.notifications.length > 50) {
            char.state.notifications = char.state.notifications.slice(0, 50);
        }
    }

    processFood(char) {
        if (!char.state.equipment || !char.state.equipment.food) return { used: false, amount: 0 };
        const food = char.state.equipment.food;
        if (!food.heal || !food.amount) return { used: false, amount: 0 };

        const stats = this.inventoryManager.calculateStats(char);
        const maxHp = stats.maxHP;
        let currentHp = char.state.health || 0;
        let eatenCount = 0;
        let totalHealed = 0;
        const MAX_EATS_PER_TICK = 50;

        // Eat while HP is missing and we haven't hit the massive limit
        // STRICT RULE: Only eat if the heal fits entirely (No Waste)
        while (food.amount > 0 && eatenCount < MAX_EATS_PER_TICK) {
            const missing = maxHp - currentHp;

            if (missing >= food.heal) {
                currentHp = currentHp + food.heal;
                food.amount--;
                eatenCount++;
                totalHealed += food.heal;

                // Update instantly to recalculate 'missing' for next loop iteration
                char.state.health = currentHp;
                if (char.state.combat) {
                    char.state.combat.playerHealth = currentHp;
                }
            } else {
                break;
            }
        }

        if (food.amount <= 0) {
            delete char.state.equipment.food;
        }

        return { used: eatenCount > 0, amount: totalHealed };
    }

    async getLeaderboard(type = 'COMBAT') {
        // type: COMBAT | DUNGEON

        // Note: Sort logic requires Supabase Indexing or Client-side Sort if few users
        // For scalability, index on: (state->'stats'->>'totalKills')::int

        let query = this.supabase
            .from('characters')
            .select('id, name, state')
            .or('is_admin.is.null,is_admin.eq.false') // Exclude characters where is_admin is true

        if (type === 'COMBAT') {
            // Sort by state->stats->totalKills DESC
            // Note: Supabase JS limit handling via order() arg
            // raw SQL equivalent: ORDER BY (state->'stats'->>'totalKills')::int DESC

            // Temporary JS Sort for simplicity (assumes < 1000 users)
            // Ideally should be done in DB query
            const { data, error } = await query.limit(100);
            if (error) return [];

            return data
                .sort((a, b) => {
                    const skillA = a.state?.skills?.COMBAT || { level: 1, xp: 0 };
                    const skillB = b.state?.skills?.COMBAT || { level: 1, xp: 0 };
                    if (skillB.level !== skillA.level) return skillB.level - skillA.level;
                    return skillB.xp - skillA.xp;
                })
                .slice(0, 50);

        } else if (type === 'DUNGEON') {
            // Sort by state->stats->dungeonsCleared DESC
            const { data, error } = await query.limit(100);
            if (error) return [];

            return data
                .sort((a, b) => {
                    const skillA = a.state?.skills?.DUNGEONEERING || { level: 1, xp: 0 };
                    const skillB = b.state?.skills?.DUNGEONEERING || { level: 1, xp: 0 };
                    if (skillB.level !== skillA.level) return skillB.level - skillA.level;
                    return skillB.xp - skillA.xp;
                })
                .slice(0, 50);
        }

        return [];
    }

    // Delegation Methods
    async startActivity(u, t, i, q) {
        return this.activityManager.startActivity(u, t, i, q);
    }
    async stopActivity(u) { return this.activityManager.stopActivity(u); }

    async startCombat(u, m, t) {
        return this.combatManager.startCombat(u, m, t);
    }
    async stopCombat(u) { return this.combatManager.stopCombat(u); }
    async equipItem(u, i) { return this.inventoryManager.equipItem(u, i); }
    async unequipItem(u, s) { return this.inventoryManager.unequipItem(u, s); }
    async getMarketListings(f) { return this.marketManager.getMarketListings(f); }
    async sellItem(u, i, q) { return this.marketManager.sellItem(u, i, q); }
    async listMarketItem(u, i, a, p) { return this.marketManager.listMarketItem(u, i, a, p); }
    async buyMarketItem(b, l, q) { return this.marketManager.buyMarketItem(b, l, q); }
    async cancelMarketListing(u, l) { return this.marketManager.cancelMarketListing(u, l); }
    async claimMarketItem(u, c) { return this.marketManager.claimMarketItem(u, c); }
    async startDungeon(u, d, r) { return this.dungeonManager.startDungeon(u, d, r); }
    async stopDungeon(u) { return this.dungeonManager.stopDungeon(u); }
}
