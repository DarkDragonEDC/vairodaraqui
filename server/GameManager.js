import crypto from 'crypto';
import { ITEMS } from '../shared/items.js';
import { CHEST_DROP_TABLE } from '../shared/chest_drops.js';
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
        this.cache = new Map(); // charId -> character object
        this.dirty = new Set(); // set of charIds that need persisting

        // Periodic Persistence Loop (Every 60 seconds)
        setInterval(async () => {
            try {
                await this.flushDirtyCharacters();
            } catch (err) {
                console.error('[DB] Error in periodic flush loop:', err);
            }
        }, 60000);
    }

    async flushDirtyCharacters() {
        if (this.dirty.size === 0) return;
        console.log(`[DB] Periodic flush for ${this.dirty.size} characters...`);
        const ids = Array.from(this.dirty);
        for (const id of ids) {
            await this.persistCharacter(id);
        }
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

    isLocked(userId) {
        return this.userLocks.has(userId);
    }

    calculateHash(state) {
        try {
            if (!state) return '';
            return crypto.createHash('md5').update(JSON.stringify(state)).digest('hex');
        } catch (err) {
            console.error(`[HASH-ERROR] Failed to calculate hash:`, err);
            return 'error-' + Date.now();
        }
    }

    async getCharacter(userId, characterId = null, catchup = false, bypassCache = false) {
        // Try Cache first
        if (characterId && this.cache.has(characterId) && !bypassCache) {
            // console.log(`[CACHE] Hit for ${characterId}`);
            return this.cache.get(characterId);
        }

        let query = this.supabase
            .from('characters')
            .select('*');

        if (characterId) {
            query = query.eq('id', characterId);
            if (userId) query = query.eq('user_id', userId);
            query = query.single();
        } else {
            // Fallback for legacy calls or first load: get the first character
            if (!userId) throw new Error("userId is required when characterId is not provided");
            query = query.eq('user_id', userId).limit(1).maybeSingle();
        }

        const { data, error } = await query;
        if (error && error.code !== 'PGRST116') throw error;

        if (data && !this.cache.has(data.id)) {
            this.cache.set(data.id, data);
        }



        if (data) {
            if (!data.state) data.state = {};
            // Attach a snapshot hash of the DB state to detect external changes
            data.dbHash = this.calculateHash(data.state);

            let updated = false;

            if (!data.state.skills) {
                data.state.skills = { ...INITIAL_SKILLS };
                updated = true;
            } else {
                // Patch missing skills for existing characters
                for (const skillKey in INITIAL_SKILLS) {
                    if (!data.state.skills[skillKey]) {
                        console.log(`[PATCH] Adding missing skill ${skillKey} to char ${data.name}`);
                        data.state.skills[skillKey] = { ...INITIAL_SKILLS[skillKey] };
                        updated = true;
                    }
                }
            }

            if (!data.state.stats) {
                data.state.stats = { str: 0, agi: 0, int: 0 };
                updated = true;
            }

            // --- RUNTIME MIGRATION: CHESTS ---
            // Fixes issue where running server overwrites DB migration
            if (data.state.inventory) {
                const inv = data.state.inventory;
                let migratedChests = false;
                for (const key of Object.keys(inv)) {
                    let newKey = key;
                    if (key.includes('_CHEST_COMMON')) newKey = key.replace('_CHEST_COMMON', '_CHEST_NORMAL');
                    else if (key.includes('_CHEST_RARE')) newKey = key.replace('_CHEST_RARE', '_CHEST_OUTSTANDING');
                    else if (key.includes('_CHEST_GOLD')) newKey = key.replace('_CHEST_GOLD', '_CHEST_EXCELLENT');
                    else if (key.includes('_CHEST_MYTHIC')) newKey = key.replace('_CHEST_MYTHIC', '_CHEST_MASTERPIECE');
                    else if (key.includes('_DUNGEON_CHEST')) newKey = key.replace('_DUNGEON_CHEST', '_CHEST_NORMAL');

                    if (newKey !== key) {
                        console.log(`[MIGRATION-RUNTIME] Converting ${key} -> ${newKey} for ${data.name}`);
                        if (inv[newKey]) {
                            // Merge quantities
                            if (typeof inv[key] === 'number') inv[newKey] += inv[key];
                            else inv[newKey].qty += inv[key].qty;
                        } else {
                            inv[newKey] = inv[key];
                        }
                        delete inv[key];
                        migratedChests = true;
                    }
                }
                if (migratedChests) updated = true;
            }

            if (!data.state.notifications) {
                data.state.notifications = [];
                updated = true;
            }

            if (!data.state.claims) {
                data.state.claims = [];
                updated = true;
            }

            if (catchup && (data.current_activity || data.state.combat) && data.last_saved) {
                const now = new Date();
                const lastSaved = new Date(data.last_saved).getTime();
                const elapsedSeconds = (now.getTime() - lastSaved) / 1000;

                // Unified report structure
                let finalReport = {
                    elapsedTime: elapsedSeconds, // Wall-clock time passed
                    totalTime: 0, // Productive time used
                    itemsGained: {},
                    xpGained: {},
                    combat: null
                };

                if (data.current_activity && data.activity_started_at) {
                    const timePerAction = data.current_activity.time_per_action || 3;
                    if (elapsedSeconds >= timePerAction) {
                        const actionsPossible = Math.floor(elapsedSeconds / timePerAction);
                        const actionsToProcess = Math.min(actionsPossible, data.current_activity.actions_remaining);

                        if (actionsToProcess > 0) {
                            const activityReport = await this.processBatchActions(data, actionsToProcess);
                            if (activityReport.processed > 0) {
                                // Always update state if anything happened
                                updated = true;

                                // Only populate the visual report if it's significant (> 10s or gains items)
                                if (activityReport.totalTime > 10 || Object.keys(activityReport.itemsGained).length > 0) {
                                    finalReport.totalTime += activityReport.totalTime;
                                    // Merge items
                                    for (const [id, qty] of Object.entries(activityReport.itemsGained)) {
                                        finalReport.itemsGained[id] = (finalReport.itemsGained[id] || 0) + qty;
                                    }
                                    // Merge XP
                                    for (const [skill, qty] of Object.entries(activityReport.xpGained)) {
                                        finalReport.xpGained[skill] = (finalReport.xpGained[skill] || 0) + qty;
                                    }
                                }
                            }
                        }
                    }
                }

                if (data.state.combat) {
                    const stats = this.inventoryManager.calculateStats(data);
                    const atkSpeed = Number(stats.attackSpeed) || 1000;
                    const secondsPerRound = atkSpeed / 1000;

                    if (elapsedSeconds >= secondsPerRound) {
                        const maxEffectSeconds = Math.min(elapsedSeconds, 43200); // Max 12 hours real time
                        const maxRounds = Math.floor(maxEffectSeconds / secondsPerRound);

                        if (maxRounds > 0) {
                            const combatReport = await this.processBatchCombat(data, maxRounds);
                            if (combatReport.processedRounds > 0) {
                                updated = true;

                                if (combatReport.totalTime > 10 || Object.keys(combatReport.itemsGained).length > 0) {
                                    finalReport.totalTime += combatReport.totalTime;
                                    finalReport.combat = {
                                        ...combatReport,
                                        monsterName: combatReport.monsterName
                                    };

                                    // Merge items
                                    for (const [id, qty] of Object.entries(combatReport.itemsGained)) {
                                        finalReport.itemsGained[id] = (finalReport.itemsGained[id] || 0) + qty;
                                    }
                                    // Merge XP
                                    for (const [skill, qty] of Object.entries(combatReport.xpGained)) {
                                        finalReport.xpGained[skill] = (finalReport.xpGained[skill] || 0) + qty;
                                    }
                                }
                            }
                        }
                    }
                }

                if (data.state.dungeon && !data.state.combat) {
                    // Dungeons take at least 1 min per wave (WAVE_DURATION)
                    if (elapsedSeconds >= 60) {
                        const dungeonReport = await this.processBatchDungeon(data, elapsedSeconds);
                        if (dungeonReport && dungeonReport.totalTime > 0) {
                            finalReport.totalTime += dungeonReport.totalTime;
                            finalReport.dungeon = dungeonReport;

                            // Merge items
                            for (const [id, qty] of Object.entries(dungeonReport.itemsGained)) {
                                finalReport.itemsGained[id] = (finalReport.itemsGained[id] || 0) + qty;
                            }
                            // Merge XP
                            for (const [skill, qty] of Object.entries(dungeonReport.xpGained)) {
                                finalReport.xpGained[skill] = (finalReport.xpGained[skill] || 0) + qty;
                            }
                            updated = true;
                        }
                    }
                }

                if (updated) {
                    // Only show the modal if total catchup was significant
                    const hasNotableGains = finalReport.totalTime > 30 || Object.keys(finalReport.itemsGained).length > 0;
                    if (hasNotableGains) {
                        data.offlineReport = finalReport;

                        // Trigger a system notification for the offline gain
                        this.addActionSummaryNotification(data, 'Offline Progress', {
                            itemsGained: finalReport.itemsGained,
                            xpGained: finalReport.xpGained,
                            totalTime: finalReport.totalTime,
                            elapsedTime: elapsedSeconds,
                            kills: finalReport.combat?.kills || 0,
                            silverGained: finalReport.combat?.silverGained || 0
                        });
                    }

                    data.last_saved = now.toISOString();
                    // Update the local dbHash to current state since we just processed it
                    data.dbHash = this.calculateHash(data.state);
                }

                // Hard limit cleanup: Stop activities that exceeded the idle limit
                if (elapsedSeconds > 43200) {
                    console.log(`[CATCHUP] Hard limit reached for ${data.name}. Clearing activities.`);
                    data.current_activity = null;
                    if (data.state.combat) delete data.state.combat;
                    if (data.state.dungeon) delete data.state.dungeon;
                    updated = true;
                }
            }

            if (updated) {
                this.markDirty(data.id);
            }
        }
        return data;
    }

    removeFromCache(charId) {
        this.cache.delete(charId);
        this.dirty.delete(charId);
    }

    markDirty(charId) {
        this.dirty.add(charId);
    }

    async persistCharacter(charId) {
        if (!this.dirty.has(charId)) return;
        const char = this.cache.get(charId);
        if (!char) return;

        // --- Snapshot Verification (Optimistic Locking) ---
        // Fetch current DB state to see if someone edited it manually
        const { data: dbChar, error: fetchError } = await this.supabase
            .from('characters')
            .select('state')
            .eq('id', charId)
            .single();

        if (!fetchError && dbChar) {
            const currentDbHash = this.calculateHash(dbChar.state);
            if (char.dbHash && currentDbHash !== char.dbHash) {
                console.warn(`[SYNC] Manual DB Edit detected for ${char.name}. Aborting save to prevent overwriting.`);
                // Invalidate cache so it's reloaded on next get
                this.removeFromCache(charId);
                return;
            }
        }

        // console.log(`[DB] Persisting character ${char.name} (${charId})`);
        const { error } = await this.supabase
            .from('characters')
            .update({
                state: char.state,
                current_activity: char.current_activity,
                activity_started_at: char.activity_started_at,
                last_saved: char.last_saved || new Date().toISOString()
            })
            .eq('id', charId);

        if (!error) {
            // Update snapshot hash after successful save
            char.dbHash = this.calculateHash(char.state);
            this.dirty.delete(charId);
        } else {
            console.error(`[DB] Error persisting ${char.name}:`, error);
        }
    }

    async syncWithDatabase(charId, userId = null) {
        const char = this.cache.get(charId);
        if (!char) return await this.getCharacter(userId, charId, false, true);

        const { data: dbChar, error } = await this.supabase
            .from('characters')
            .select('*')
            .eq('id', charId)
            .single();

        if (!error && dbChar) {
            const currentDbHash = this.calculateHash(dbChar.state);
            if (currentDbHash !== char.dbHash) {
                console.log(`[SYNC] Refreshing character ${char.name} from DB (Manual edit detected)`);
                // Clear dirty flag and overwrite with DB data
                this.dirty.delete(charId);
                Object.assign(char, dbChar);
                char.dbHash = currentDbHash;
                return true;
            }
        }
        return false;
    }

    async persistAllDirty() {
        if (this.dirty.size === 0) return;
        // console.log(`[DB] Persisting ${this.dirty.size} dirty characters...`);
        const promises = Array.from(this.dirty).map(id => this.persistCharacter(id));
        await Promise.all(promises);
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
                    const globalBonus = stats.globals?.xpYield || 0;
                    const catBonus = stats.xpBonus?.[type] || 0; // type is 'GATHERING', 'REFINING', etc.

                    const finalXp = Math.floor(result.xpGained * (1 + (globalBonus + catBonus) / 100));
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

    async processBatchCombat(char, rounds) {
        let kills = 0;
        let combatXp = 0;
        let silverGained = 0;
        const itemsGained = {};
        let died = false;
        let foodConsumed = 0;

        const stats = this.inventoryManager.calculateStats(char);
        const atkSpeed = Number(stats.attackSpeed) || 1000;
        const monsterName = char.state.combat?.mobName || "Unknown Monster";

        let roundsProcessed = 0;
        for (let i = 0; i < rounds; i++) {
            roundsProcessed = i + 1;
            // Check food before each round
            const foodResult = this.processFood(char);
            if (foodResult.used) foodConsumed += foodResult.amount;

            const result = await this.combatManager.processCombatRound(char);
            if (!result || !char.state.combat) {
                if (!char.state.combat && char.state.health <= 0) died = true;
                break;
            }

            if (result.details) {
                if (result.details.victory) {
                    kills++;
                    combatXp += result.details.xpGained || 0;
                    silverGained += result.details.silverGained || 0;
                    if (result.details.lootGained) {
                        result.details.lootGained.forEach(itemId => {
                            itemsGained[itemId] = (itemsGained[itemId] || 0) + 1;
                        });
                    }
                }
            }
        }

        return {
            processedRounds: roundsProcessed,
            kills,
            xpGained: { COMBAT: combatXp },
            silverGained,
            itemsGained,
            died,
            foodConsumed,
            totalTime: (roundsProcessed * atkSpeed) / 1000,
            monsterName
        };
    }

    async processBatchDungeon(char, seconds) {
        let remainingSeconds = seconds;
        const itemsGained = {};
        const xpGained = {};
        let wavesCleared = 0;
        let dungeonsTotalCleared = 0;
        let died = false;

        // console.log(`[DUNGEON-BATCH] Starting batch for ${char.name}, ${seconds}s available.`);

        while (remainingSeconds >= 5 && char.state.dungeon && !died) {
            const dungeonState = char.state.dungeon;
            // 60 seconds per wave (WAVE_DURATION)
            if (remainingSeconds < 1) break;

            const result = await this.dungeonManager.processDungeonTick(char);

            if (!result) {
                // No immediate change, check if we are in combat
                if (char.state.combat) {
                    // Process combat batch for this wave
                    const combatReport = await this.processBatchCombat(char, 1000); // 1000 rounds should be plenty for one mob
                    remainingSeconds -= combatReport.totalTime;

                    // Merge gains
                    for (const [id, qty] of Object.entries(combatReport.itemsGained)) {
                        itemsGained[id] = (itemsGained[id] || 0) + qty;
                    }
                    for (const [skill, qty] of Object.entries(combatReport.xpGained)) {
                        xpGained[skill] = (xpGained[skill] || 0) + qty;
                    }

                    if (combatReport.died) {
                        died = true;
                        break;
                    }
                } else {
                    // Stuck or waiting? Skip a bit of time
                    remainingSeconds -= 5;
                }
            } else {
                // Tick produced a result (e.g. wave cleared, next wave started, completed)
                if (result.dungeonUpdate) {
                    const status = result.dungeonUpdate.status;
                    if (status === 'COMPLETED') {
                        dungeonsTotalCleared++;
                        // Add completion rewards
                        const rewards = result.dungeonUpdate.rewards;
                        if (rewards) {
                            xpGained['DUNGEONEERING'] = (xpGained['DUNGEONEERING'] || 0) + (rewards.xp || 0);
                            xpGained['COMBAT'] = (xpGained['COMBAT'] || 0) + (rewards.xp || 0);
                            if (rewards.items) {
                                rewards.items.forEach(itemStr => {
                                    const match = itemStr.match(/^(\d+)x (.+)$/);
                                    if (match) {
                                        const qty = parseInt(match[1]);
                                        const id = match[2];
                                        itemsGained[id] = (itemsGained[id] || 0) + qty;
                                    } else {
                                        itemsGained[itemStr] = (itemsGained[itemStr] || 0) + 1;
                                    }
                                });
                            }
                        }
                    } else if (status === 'FAILED') {
                        died = true;
                    } else if (status === 'WALKING') {
                        // Consume walking time
                        const walkTime = result.dungeonUpdate.timeLeft || 60;
                        remainingSeconds -= Math.min(remainingSeconds, walkTime);
                        // Force complete the walking step if we have time
                        if (remainingSeconds > 0) {
                            char.state.dungeon.wave_started_at = Date.now() - (60 * 1000); // Hack to make next tick advance
                        }
                    }
                }

                // If tick didn't consume time explicitly, consumer a small bit to avoid infinite loop
                remainingSeconds -= 1;
            }
        }

        return {
            totalTime: seconds - remainingSeconds,
            itemsGained,
            xpGained,
            dungeonsTotalCleared,
            died
        };
    }

    async createCharacter(userId, name) {
        // Check character limit
        const { data: chars, error: countError } = await this.supabase
            .from('characters')
            .select('id')
            .eq('user_id', userId);

        if (chars && chars.length >= 2) throw new Error("Character limit reached (max 2)");

        // Check if name exists (case-insensitive)
        const { data: existingChar, error: nameError } = await this.supabase
            .from('characters')
            .select('id')
            .ilike('name', name.trim())
            .maybeSingle();

        if (existingChar) throw new Error("Character name already taken.");

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
                id: crypto.randomUUID(),
                user_id: userId,
                name: name.trim(),
                state: initialState,
                last_saved: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                throw new Error("Character name already taken.");
            }
            throw new Error(error.message || 'Error creating character');
        }

        if (data) {
            this.cache.set(data.id, data);
        }
        return data;
    }

    async getStatus(userId, catchup = false, characterId = null, bypassCache = false) {
        const char = await this.getCharacter(userId, characterId, catchup, bypassCache);
        if (!char) return { noCharacter: true };

        const stats = this.inventoryManager.calculateStats(char);

        const status = {
            character_id: char.id,
            user_id: char.user_id,
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

    async clearOfflineReport(userId, characterId) {
        const char = await this.getCharacter(userId, characterId);
        if (char) {
            char.offlineReport = null;
            // Note: If offlineReport is in its own column, we might need a direct update.
            // But if it's transient (not in state), then the server will just clear it from memory.
            // However, the user says it "opens with a farm that is not mine".
            // If it's stored in the 'state', we MUST clear it there.
        }
    }

    async runMaintenance() {
        const now = new Date().toISOString();
        const IDLE_LIMIT_HOURS = 12;
        const limitDate = new Date(Date.now() - (IDLE_LIMIT_HOURS * 60 * 60 * 1000)).toISOString();

        console.log(`[MAINTENANCE] Starting background cleanup (Limit: ${IDLE_LIMIT_HOURS}h)...`);

        try {
            // Find all characters with any active activity
            const { data: allActive, error } = await this.supabase
                .from('characters')
                .select('id, user_id, name, current_activity, state, activity_started_at')
                .or('current_activity.not.is.null,state->combat.not.is.null,state->dungeon.not.is.null');

            if (error) throw error;

            if (!allActive || allActive.length === 0) {
                console.log("[MAINTENANCE] No active characters found.");
                return;
            }

            const limitMs = IDLE_LIMIT_HOURS * 60 * 60 * 1000;
            const nowMs = Date.now();

            const toCleanup = allActive.filter(char => {
                let startTime = null;
                if (char.state.dungeon && char.state.dungeon.started_at) {
                    startTime = new Date(char.state.dungeon.started_at);
                } else if (char.state.combat && char.state.combat.started_at) {
                    startTime = new Date(char.state.combat.started_at);
                } else if (char.current_activity && char.activity_started_at) {
                    startTime = new Date(char.activity_started_at);
                }

                if (startTime && !isNaN(startTime.getTime())) {
                    return (nowMs - startTime.getTime()) > limitMs;
                }
                return false;
            });

            if (toCleanup.length === 0) {
                console.log("[MAINTENANCE] No characters found exceeding the 12h limit.");
                return;
            }

            console.log(`[MAINTENANCE] Found ${toCleanup.length} characters to clean up.`);

            for (const char of toCleanup) {
                console.log(`[MAINTENANCE] Cleaning up ${char.name} (${char.id})...`);
                // Calling getCharacter with catchup=true will process gains up to 12h and clear the activity
                await this.executeLocked(char.user_id, async () => {
                    await this.getCharacter(char.user_id, char.id, true);
                });
            }

            console.log("[MAINTENANCE] Background cleanup finished.");
        } catch (err) {
            console.error("[MAINTENANCE] Error during background cleanup:", err);
        }
    }

    async processTick(userId, characterId) {
        const char = await this.getCharacter(userId, characterId);
        if (!char) return null;

        // Keep last_saved in sync while online to avoid double-processing if server crashes
        char.last_saved = new Date().toISOString();

        const foodResult = this.processFood(char);
        const foodUsed = foodResult.used;

        if (!char.current_activity && !char.state.combat && !foodUsed && !char.state.dungeon) return null;

        const now = Date.now();
        const IDLE_LIMIT_MS = 12 * 60 * 60 * 1000; // 12 Hours

        // Real-time 12h Limit Check
        let limitExceeded = false;
        if (char.current_activity && char.activity_started_at) {
            if (now - new Date(char.activity_started_at).getTime() > IDLE_LIMIT_MS) limitExceeded = true;
        } else if (char.state.combat && char.state.combat.started_at) {
            if (now - new Date(char.state.combat.started_at).getTime() > IDLE_LIMIT_MS) limitExceeded = true;
        } else if (char.state.dungeon && char.state.dungeon.started_at) {
            if (now - new Date(char.state.dungeon.started_at).getTime() > IDLE_LIMIT_MS) limitExceeded = true;
        }

        if (limitExceeded) {
            console.log(`[LIMIT] 12h limit reached for ${char.name}. Stopping action.`);
            char.current_activity = null;
            char.activity_started_at = null;
            if (char.state.combat) delete char.state.combat;
            if (char.state.dungeon) delete char.state.dungeon;

            this.markDirty(char.id);
            await this.persistCharacter(char.id);

            return {
                success: false,
                message: "12-hour idle limit reached. Action stopped.",
                status: await this.getStatus(char.user_id, false, char.id)
            };
        }
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
                if (!item) {
                    console.error(`[ProcessTick] Item not found in LOOKUP: ${item_id}`);
                    char.current_activity = null;
                    return { success: false, message: "Item not found" };
                }

                if (actions_remaining > 0) {
                    let result = null;
                    try {
                        const normalizedType = type.toUpperCase();
                        switch (normalizedType) {
                            case 'GATHERING': result = await this.activityManager.processGathering(char, item); break;
                            case 'REFINING': result = await this.activityManager.processRefining(char, item); break;
                            case 'CRAFTING': result = await this.activityManager.processCrafting(char, item); break;
                        }
                        if (result && result.error) {
                            // console.log(`[ProcessTick] Activity Failed for ${char.name}: ${result.error}`);
                        } else if (result) {
                            // console.log(`[ProcessTick] Activity Success for ${char.name}: ${item.name} (${result.skillKey})`);
                        }
                    } catch (err) {
                        console.error(`[ProcessTick] Activity Error for ${char.name} (${type}, ${item_id}):`, err);
                        char.current_activity = null;
                        return { success: false, message: "Activity crashed: " + err.message };
                    }

                    char.current_activity.next_action_at = targetTime + (time_per_action * 1000);
                    if (now - char.current_activity.next_action_at > 5000) {
                        char.current_activity.next_action_at = now + (time_per_action * 1000);
                    }

                    if (result && !result.error) {
                        itemsGained++;
                        if (result.leveledUp) leveledUp = result.leveledUp;
                        lastActivityResult = result;

                        // Track session stats
                        const activity = char.current_activity;
                        if (activity) {
                            if (!activity.sessionItems) activity.sessionItems = {};
                            if (typeof activity.sessionXp === 'undefined') activity.sessionXp = 0;

                            if (result.itemGained) {
                                activity.sessionItems[result.itemGained] = (activity.sessionItems[result.itemGained] || 0) + (result.amountGained || 1);
                            }
                            if (result.xpGained) {
                                const stats = this.inventoryManager.calculateStats(char);
                                const xpBonus = stats.globals?.xpYield || 0;
                                const finalXp = Math.floor(result.xpGained * (1 + xpBonus / 100));
                                activity.sessionXp = (activity.sessionXp || 0) + finalXp;
                            }
                        }

                        const newActionsRemaining = actions_remaining - 1;
                        activityFinished = newActionsRemaining <= 0;
                        if (activityFinished) {
                            // Generate final report before clearing
                            const elapsedSeconds = char.activity_started_at ? (Date.now() - new Date(char.activity_started_at).getTime()) / 1000 : 0;
                            this.addActionSummaryNotification(char, activity.type, {
                                itemsGained: activity.sessionItems,
                                xpGained: { [result.skillKey]: activity.sessionXp },
                                totalTime: elapsedSeconds
                            });

                            char.current_activity = null;
                            char.activity_started_at = null;
                        } else {
                            char.current_activity.actions_remaining = newActionsRemaining;
                        }
                    } else {
                        lastActivityResult = result;
                        // For failure (e.g. no ingredients), also notify if we had progress
                        const activity = char.current_activity;
                        if (activity && (activity.sessionXp > 0 || Object.keys(activity.sessionItems).length > 0)) {
                            const elapsedSeconds = char.activity_started_at ? (Date.now() - new Date(char.activity_started_at).getTime()) / 1000 : 0;
                            this.addActionSummaryNotification(char, activity.type, {
                                itemsGained: activity.sessionItems,
                                xpGained: { [activity.type]: activity.sessionXp }, // Simplified key
                                totalTime: elapsedSeconds
                            });
                        }
                        char.current_activity = null;
                        char.activity_started_at = null;
                    }
                }
            }
        }

        if (leveledUp) {
            const skillName = leveledUp.skill.replace(/_/g, ' ');
            this.addNotification(char, 'LEVEL_UP', `Your ${skillName} skill raised to level ${leveledUp.level}!`);
        }

        let stateChanged = false;

        if (char.state.combat) {
            const combat = char.state.combat;
            let nextAttack = Number(combat.next_attack_at) || (now + 500);

            if (!combat.next_attack_at) {
                combat.next_attack_at = nextAttack;
                stateChanged = true;
            }

            // Respawn Delay Check
            if (combat.respawn_at) {
                if (now < combat.respawn_at) {
                    // Waiting for respawn...
                    return null; // Skip processing this tick
                } else {
                    // Respawn time reached!
                    combat.mobHealth = combat.mobMaxHealth;
                    delete combat.respawn_at;
                    stateChanged = true;
                }
            }

            const stats = this.inventoryManager.calculateStats(char);
            const atkSpeed = Math.max(200, Number(stats.attackSpeed) || 1000);
            let roundsThisTick = 0;
            const MAX_ROUNDS = 20; // Allow catching up faster
            const combatRounds = [];

            while (now >= combat.next_attack_at && roundsThisTick < MAX_ROUNDS && char.state.combat) {
                try {
                    const roundResult = await this.combatManager.processCombatRound(char);
                    roundsThisTick++;

                    if (roundResult) {
                        combatRounds.push(roundResult);
                        // We take the last one as the primary combatResult for basic compatibility
                        combatResult = roundResult;
                    }

                    // Advance the timer by exactly one interval
                    combat.next_attack_at += atkSpeed;
                    stateChanged = true;

                    // If character died or combat stopped, break the loop
                    if (!char.state.combat) break;

                    // If Mob Died (Victory), apply delay and break loop
                    if (roundResult && roundResult.details && roundResult.details.victory) {
                        combat.next_attack_at += 1000; // Add 1s delay penalty
                        combat.respawn_at = now + 1000; // Set visual/logic blocker
                        stateChanged = true;
                        break; // Stop multiple kills in one tick
                    }

                } catch (e) {
                    console.error(`[COMBAT_ERROR] Error in processCombatRound for ${char.name}:`, e);
                    break;
                }
            }

            // If we have multiple rounds, we attach them to the result
            if (combatRounds.length > 0) {
                // Fix Circular Reference: Create a new object instead of mutating one inside the array
                const primary = combatResult || combatRounds[0];
                combatResult = {
                    ...primary,
                    allRounds: combatRounds
                };

                // Sum up totals for the primary result object to keep UI counters happy
                combatResult.details = {
                    ...primary.details,
                    totalPlayerDmgThisTick: combatRounds.reduce((acc, r) => acc + (r.details?.playerDmg || 0), 0),
                    totalMobDmgThisTick: combatRounds.reduce((acc, r) => acc + (r.details?.mobDmg || 0), 0)
                };
            }

            // Safety: If timer is still in the past after MAX_ROUNDS, jump it forward to now
            if (char.state.combat && now >= combat.next_attack_at) {
                combat.next_attack_at = now + atkSpeed;
                stateChanged = true;
            }

            // Safety: Check for stuck timer in far future (> 10s)
            if (char.state.combat && combat.next_attack_at > now + 10000) {
                combat.next_attack_at = now;
                stateChanged = true;
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
            this.markDirty(char.id);
        }

        if (char.current_activity || char.state.combat || itemsGained > 0 || combatResult || dungeonResult) {
            const returnObj = {
                success: true,
                message: lastActivityResult?.message || combatResult?.message || dungeonResult?.dungeonUpdate?.message || (foodUsed ? "Food consumed" : ""),
                leveledUp,
                activityFinished,
                combatUpdate: combatResult,
                dungeonUpdate: dungeonResult?.dungeonUpdate,
                healingUpdate: foodUsed ? { amount: foodResult.amount, source: 'FOOD' } : null,
                status: {
                    character_id: char.id,
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
            if (char.state.combat) {
                // console.log(`[DEBUG-TICK] Sending Status. Kills: ${char.state.combat.kills}`);
            }
            return returnObj;
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
        this.markDirty(charId);
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

    addActionSummaryNotification(char, actionType, stats) {
        // console.log(`[DEBUG] addActionSummaryNotification for ${char.name}. Type: ${actionType}`);
        // stats can be offlineReport or a simple gains object
        // { itemsGained: {}, xpGained: {}, totalTime: seconds, kills?: number, silverGained?: number, elapsedTime?: number }
        const { itemsGained, xpGained, totalTime, kills, silverGained, elapsedTime } = stats;

        let timeVal = totalTime || elapsedTime || 0;
        let timeStr = "";
        if (timeVal < 60) timeStr = `${Math.floor(timeVal)}s`;
        else if (timeVal < 3600) timeStr = `${Math.floor(timeVal / 60)}m ${Math.floor(timeVal % 60)}s`;
        else timeStr = `${Math.floor(timeVal / 3600)}h ${Math.floor((timeVal % 3600) / 60)}m`;

        let itemsStr = Object.entries(itemsGained || {})
            .map(([id, qty]) => `${qty}x ${id.replace(/_/g, ' ')}`)
            .join(', ');

        let xpParts = [];
        for (const [skill, xp] of Object.entries(xpGained || {})) {
            if (xp > 0) xpParts.push(`+${xp} ${skill.replace(/_/g, ' ')}`);
        }
        let xpStr = xpParts.join(', ');

        let message = `${actionType} Summary: `;
        message += `Duration: ${timeStr}. `;
        if (kills) message += `Kills: ${kills}. `;
        if (xpStr) message += `XP: ${xpStr}. `;
        if (silverGained) message += `Silver: +${silverGained.toLocaleString()}. `;
        if (itemsStr) message += `Gained: ${itemsStr}.`;
        else message += "No items gained.";

        // console.log(`[NOTIF] Adding system notif for ${char.name}: ${message}`);
        this.addNotification(char, 'SYSTEM', message);
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
        let query = this.supabase
            .from('characters')
            .select('id, name, state')
            .or('is_admin.is.null,is_admin.eq.false'); // Exclude admins

        const { data, error } = await query.limit(100);
        if (error) return [];

        return data
            .filter(c => c && c.state)
            .sort((a, b) => {
                const getVal = (char, key) => {
                    if (key === 'SILVER') return char.state.silver || 0;
                    if (key === 'LEVEL') {
                        // Total Level
                        return Object.values(char.state.skills || {}).reduce((acc, s) => acc + (s.level || 1), 0);
                    }
                    // Specific Skill
                    const skill = char.state.skills?.[key] || { level: 1, xp: 0 };
                    // Return a composite value for sorting: Level * 1Billion + XP
                    // This ensures Level is primary, XP is secondary
                    return (skill.level * 1000000000) + skill.xp;
                };

                const valA = getVal(a, type);
                const valB = getVal(b, type);

                return valB - valA; // DESC
            })
            .slice(0, 50);
    }

    // Delegation Methods
    async startActivity(u, c, t, i, q) { return this.activityManager.startActivity(u, c, t, i, q); }
    async stopActivity(u, c) { return this.activityManager.stopActivity(u, c); }

    async startCombat(u, c, m, t) { return this.combatManager.startCombat(u, c, m, t); }
    async stopCombat(u, c) { return this.combatManager.stopCombat(u, c); }

    async equipItem(u, c, i) { return this.inventoryManager.equipItem(u, c, i); }
    async unequipItem(u, c, s) { return this.inventoryManager.unequipItem(u, c, s); }

    async getMarketListings(f) { return this.marketManager.getMarketListings(f); }
    async sellItem(u, c, i, q) { return this.marketManager.sellItem(u, c, i, q); }
    async listMarketItem(u, c, i, a, p) { return this.marketManager.listMarketItem(u, c, i, a, p); }
    async buyMarketItem(b, c, l, q) { return this.marketManager.buyMarketItem(b, c, l, q); }
    async cancelMarketListing(u, c, l) { return this.marketManager.cancelMarketListing(u, c, l); }
    async claimMarketItem(u, c, cl) { return this.marketManager.claimMarketItem(u, c, cl); }

    async startDungeon(u, c, d, r) { return this.dungeonManager.startDungeon(u, c, d, r); }
    async stopDungeon(u, c) { return this.dungeonManager.stopDungeon(u, c); }
    async consumeItem(userId, characterId, itemId, quantity = 1) {
        const char = await this.getCharacter(userId, characterId);
        const itemData = this.inventoryManager.resolveItem(itemId);
        const safeQty = Math.max(1, parseInt(quantity) || 1);


        if (!itemData) throw new Error("Item not found");

        const invQty = char.state.inventory?.[itemId] || 0;
        if (invQty < safeQty) throw new Error(`You don't have enough ${itemData.name}`);

        this.inventoryManager.consumeItems(char, { [itemId]: safeQty });

        let message = `Used ${safeQty}x ${itemData.name}`;

        if (itemData.type === 'FOOD') {
            const healAmount = (itemData.heal || 50) * safeQty;
            message += ` (Recovered ${healAmount} HP)`;
        } else if (itemData.type === 'POTION') {
            const effect = itemData.effect;
            const value = itemData.value;
            const baseDuration = itemData.duration || itemData.time || 600;
            const totalDuration = baseDuration * safeQty;

            this.applyBuff(char, effect, value, totalDuration);
            message += ` (Buff Applied: +${Math.round(value * 100)}% for ${Math.round(totalDuration / 60)}m)`;
        } else if (itemData.id.includes('CHEST')) {
            // Chest Logic
            const tier = itemData.tier || 1;

            // Simulate adding items to check for space (Approximation)
            const tempInv = { ...char.state.inventory };
            const SIMULATED_MAX = 50;

            const totalRewards = {
                items: {}
            };

            // Loop for Quantity
            for (let i = 0; i < safeQty; i++) {
                // Collect all potential new items first
                const potentialDrops = [];

                // Refined Resources
                const REFINED_TYPES = CHEST_DROP_TABLE.REFINED_TYPES;
                const rarityConfig = CHEST_DROP_TABLE.RARITIES[itemData.rarity] || CHEST_DROP_TABLE.RARITIES.COMMON;
                const baseQty = rarityConfig.baseQty;

                // 2. Calculate Items
                // Single Refined Type Drop
                const randomType = REFINED_TYPES[Math.floor(Math.random() * REFINED_TYPES.length)];
                const qty = Math.floor(baseQty + (Math.random() * tier));

                if (qty > 0) {
                    const rId = `T${tier}_${randomType}`;
                    totalRewards.items[rId] = (totalRewards.items[rId] || 0) + qty;
                }

                // Crests (Low Chance, Max 1 per chest)
                const crestChance = rarityConfig.crestChance;

                if (Math.random() < crestChance) {
                    const crestId = `T${tier}_CREST`;
                    totalRewards.items[crestId] = (totalRewards.items[crestId] || 0) + 1;
                }
            }

            // 3. Check Space using TOTAL rewards list
            // We count how many NEW slots we need
            let newSlotsNeeded = 0;
            for (const [rId, qty] of Object.entries(totalRewards.items)) {
                if (!tempInv[rId]) {
                    newSlotsNeeded++;
                }
            }

            if (Object.keys(tempInv).length + newSlotsNeeded > SIMULATED_MAX) {
                throw new Error("Inventory Full! Cannot open all chests.");
            }

            // 4. Apply Rewards (Space Guaranteed)
            let message = `Opened ${safeQty}x ${itemData.name}\nContents:`;

            const rewards = { items: [] }; // For the UI return

            for (const [rId, qty] of Object.entries(totalRewards.items)) {
                this.inventoryManager.addItemToInventory(char, rId, qty);
                message += `\n${qty}x ${rId.replace(/T\d+_/, '')}`;
                rewards.items.push({ id: rId, qty });
            }

            await this.saveState(char.id, char.state);
            await this.persistCharacter(char.id);
            return { success: true, message, itemId, rewards: rewards.items.length > 0 ? rewards : null };
        } else if (false) { // Skip old block


            await this.saveState(char.id, char.state);
            return { success: true, message, itemId, rewards };
        }

        await this.saveState(char.id, char.state);
        await this.persistCharacter(char.id);
        return { success: true, message, itemId };
    }

    applyBuff(char, type, value, durationSeconds) {
        if (!type) {
            console.error("[DEBUG-POTION] ERROR: applyBuff called with NO TYPE!");
            return;
        }
        if (!char.state.active_buffs) char.state.active_buffs = {};

        const now = Date.now();
        const existing = char.state.active_buffs[type];
        const durationMs = durationSeconds * 1000;

        // Logic: Stacking identical buffs or overwriting with better ones
        if (existing && existing.expiresAt > now) {
            // Case 1: Same value (allow small float error) -> ADD time
            if (Math.abs(existing.value - value) < 0.0001) {
                existing.expiresAt += durationMs;
                // console.log(`[DEBUG-POTION] Stacking ${type}: Added ${durationSeconds}s. New expiry: ${new Date(existing.expiresAt).toLocaleTimeString()}`);
            }
            // Case 2: New value is BETTER -> Overwrite (Reset time to new potion)
            else if (value > existing.value) {
                char.state.active_buffs[type] = {
                    value: value,
                    expiresAt: now + durationMs
                };
                // console.log(`[DEBUG-POTION] Upgraded ${type} value from ${existing.value} to ${value}. Resetting time.`);
            }
            // Case 3: New value is WORSE -> Ignore (we have a better one active)
            else {
                // console.log(`[DEBUG-POTION] Ignored weaker potion for ${type} (Active: ${existing.value}, New: ${value})`);
            }
        } else {
            // Case 4: No existing or expired -> Apply fresh
            char.state.active_buffs[type] = {
                value: value,
                expiresAt: now + durationMs
            };
            // console.log(`[DEBUG-POTION] Applied fresh ${type} buff: ${value} for ${durationSeconds}s`);
        }
    }
}
