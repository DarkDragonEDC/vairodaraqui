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
                        data.offlineReport = offlineReport;
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
                    xpGained[result.skillKey] = (xpGained[result.skillKey] || 0) + result.xpGained;
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

        const { data, error } = await this.supabase
            .from('characters')
            .insert({
                id: userId,
                user_id: userId,
                name: name,
                state: {
                    inventory: {},
                    skills: { ...INITIAL_SKILLS },
                    stats: { str: 0, agi: 0, int: 0 },
                    silver: 0,
                    health: 100,
                    maxHealth: 100
                }
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

        let foodUsed = this.processFood(char);

        if (!char.current_activity && !char.state.combat && !foodUsed) return null;

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

        if (char.state.combat) {
            if (!char.state.combat.next_attack_at) {
                char.state.combat.next_attack_at = now + 1000;
            }
            if (now >= char.state.combat.next_attack_at) {
                combatResult = await this.combatManager.processCombatRound(char);
                char.state.combat.next_attack_at = now + (stats.attackSpeed || 1500);
                if (combatResult && combatResult.leveledUp) leveledUp = combatResult.leveledUp;

                // Dungeon Progression Logic
                if (combatResult?.details?.victory && char.state.dungeon) {
                    const dungeonResult = await this.dungeonManager.processDungeonVictory(char);
                    if (dungeonResult) {
                        combatResult.message = dungeonResult.message;
                        if (dungeonResult.finished) {
                            activityFinished = true; // Forçar save
                        }
                    }
                }
            }
        }

        if (itemsGained > 0 || combatResult || foodUsed || activityFinished) {
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

        if (char.current_activity || char.state.combat || itemsGained > 0 || combatResult) {
            return {
                success: true,
                message: lastActivityResult?.message || combatResult?.message || (foodUsed ? "Food consumed" : ""),
                leveledUp,
                activityFinished,
                combatUpdate: combatResult,
                status: {
                    user_id: char.user_id,
                    name: char.name,
                    state: char.state,
                    calculatedStats: this.inventoryManager.calculateStats(char),
                    current_activity: char.current_activity,
                    activity_started_at: char.activity_started_at,
                    dungeon_state: char.dungeon_state,
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

    processFood(char) {
        if (!char.state.equipment || !char.state.equipment.food) return false;
        const food = char.state.equipment.food;
        if (!food.heal || !food.amount) return false;

        const stats = this.inventoryManager.calculateStats(char);
        const maxHp = stats.maxHP;
        const currentHp = char.state.health || 0;
        const missing = maxHp - currentHp;

        if (missing > food.heal) {
            char.state.health = Math.min(maxHp, currentHp + food.heal);
            if (char.state.combat) {
                char.state.combat.playerHealth = char.state.health;
            }
            food.amount--;
            if (food.amount <= 0) {
                delete char.state.equipment.food;
            }
            return true;
        }
        return false;
    }

    async getLeaderboard() {
        const { data, error } = await this.supabase
            .from('characters')
            .select('id, name, state')
            .limit(100);
        if (error) return [];
        return data || [];
    }

    // Delegation Methods
    async startActivity(u, t, i, q) { return this.activityManager.startActivity(u, t, i, q); }
    async stopActivity(u) { return this.activityManager.stopActivity(u); }
    async startCombat(u, m, t) { return this.combatManager.startCombat(u, m, t); }
    async stopCombat(u) { return this.combatManager.stopCombat(u); }
    async equipItem(u, i) { return this.inventoryManager.equipItem(u, i); }
    async unequipItem(u, s) { return this.inventoryManager.unequipItem(u, s); }
    async getMarketListings(f) { return this.marketManager.getMarketListings(f); }
    async sellItem(u, i, q) { return this.marketManager.sellItem(u, i, q); }
    async listMarketItem(u, i, a, p) { return this.marketManager.listMarketItem(u, i, a, p); }
    async buyMarketItem(b, l) { return this.marketManager.buyMarketItem(b, l); }
    async cancelMarketListing(u, l) { return this.marketManager.cancelMarketListing(u, l); }
    async claimMarketItem(u, c) { return this.marketManager.claimMarketItem(u, c); }
    async startDungeon(u, d) { return this.dungeonManager.startDungeon(u, d); }
}
