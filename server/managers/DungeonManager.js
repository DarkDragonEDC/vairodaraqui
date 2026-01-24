
import { DUNGEONS } from '../../shared/dungeons.js';
import { MONSTERS } from '../../shared/monsters.js';

const WAVE_DURATION = 60 * 1000; // 1 minute per wave
const MAX_DUNGEON_TIME = 12 * 60 * 60 * 1000; // 12 hours safety limit

export class DungeonManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
    }

    async startDungeon(userId, dungeonId, repeatCount = 0) {
        const char = await this.gameManager.getCharacter(userId);
        if (char.state.dungeon) throw new Error("Already in a dungeon");
        if (char.state.combat) throw new Error("Cannot enter dungeon while in combat");

        const dungeon = Object.values(DUNGEONS).find(d => d.id === dungeonId);
        if (!dungeon) throw new Error("Dungeon not found");

        const inventory = char.state.inventory || {};
        const mapId = dungeon.reqItem;
        if (!inventory[mapId] || inventory[mapId] < 1) {
            throw new Error(`Missing required item: ${mapId}`);
        }

        // Level Requirement Check
        const combatLevel = char.state.skills?.COMBAT?.level || 1;
        if (combatLevel < (dungeon.reqLevel || 1)) {
            throw new Error(`Combat level ${dungeon.reqLevel} required to enter this dungeon`);
        }

        // Consume Map
        this.gameManager.inventoryManager.consumeItems(char, { [mapId]: 1 });

        // Initialize Dungeon State
        char.state.dungeon = {
            id: dungeonId,
            tier: dungeon.tier,
            wave: 1,
            maxWaves: dungeon.waves,
            active: true,
            started_at: new Date().toISOString(),
            status: 'PREPARING', // PREPARING -> FIGHTING -> WAITING_NEXT_WAVE -> WALKING -> BOSS -> COMPLETED
            repeatCount: repeatCount,
            wave_started_at: Date.now(),
            lootLog: []
        };

        await this.gameManager.saveState(char.id, char.state);
        return { success: true, message: `Entered ${dungeon.name}` };
    }

    async processDungeonTick(char) {
        try {
            if (!char.state.dungeon) return;
            // console.log(`[DUNGEON] Processing tick for ${char.name}. Status: ${char.state.dungeon.status}`);

            const dungeonState = char.state.dungeon;
            const dungeonConfig = Object.values(DUNGEONS).find(d => d.id === dungeonState.id);

            if (!dungeonConfig) {
                console.error(`[DUNGEON] Config not found for ID: ${dungeonState.id}`);
                return;
            }

            const now = Date.now();
            const totalElapsed = now - new Date(dungeonState.started_at).getTime();

            // 1. Max Time Check (Safety)
            if (totalElapsed > MAX_DUNGEON_TIME) {
                console.log(`[DUNGEON] Dungeon timed out for ${char.name}`);
                delete char.state.dungeon;
                if (char.state.combat) delete char.state.combat;
                return { dungeonUpdate: { status: 'FAILED', message: "Dungeon time limit reached!" } };
            }

            // 2. WALKING Logic
            if (dungeonState.status === 'WALKING') {
                const waveElapsed = now - (dungeonState.wave_started_at || now);
                const timeLeft = Math.ceil((WAVE_DURATION - waveElapsed) / 1000);

                if (waveElapsed >= WAVE_DURATION) {
                    // Time up, proceed
                    if (dungeonState.wave < dungeonState.maxWaves) {
                        dungeonState.wave++;
                        dungeonState.status = 'WAITING_NEXT_WAVE';
                        return this.startNextWave(char, dungeonConfig);
                    } else {
                        // It was the last wave (Boss), so we finish
                        return this.completeDungeon(char, dungeonConfig);
                    }
                } else {
                    return {
                        dungeonUpdate: {
                            status: 'WALKING',
                            message: `Walking to next area (${timeLeft}s)...`,
                            timeLeft: timeLeft
                        }
                    };
                }
            }

            // 3. Combat/Wave Logic
            if (char.state.combat) return;

            if (char.state.health <= 0) {
                console.log(`[DUNGEON] Player ${char.name} died. Failing dungeon.`);
                await this.saveDungeonLog(char, dungeonConfig, 'FAILED');
                delete char.state.dungeon;
                return { dungeonUpdate: { status: 'FAILED', message: "You died in the dungeon!" } };
            }

            if (dungeonState.status === 'PREPARING' || dungeonState.status === 'WAITING_NEXT_WAVE') {
                return this.startNextWave(char, dungeonConfig);
            }

            if (dungeonState.status === 'FIGHTING' || dungeonState.status === 'BOSS_FIGHT') {
                console.log(`[DUNGEON] Wave cleared or boss defeated for ${char.name}. Wave: ${dungeonState.wave}`);

                // Check Wave Duration
                const waveElapsed = now - (dungeonState.wave_started_at || now);

                if (waveElapsed < WAVE_DURATION) {
                    dungeonState.status = 'WALKING';
                    // wave_started_at remains the same to track total time spent on this "step"
                    // Effectively we are just pausing progress until WAVE_DURATION is met
                    const timeLeft = Math.ceil((WAVE_DURATION - waveElapsed) / 1000);
                    return {
                        dungeonUpdate: {
                            status: 'WALKING',
                            message: `Area cleared! Walking... (${timeLeft}s)`,
                            timeLeft: timeLeft
                        }
                    };
                }

                // If we are here, duration is met (e.g. taken long enough to kill)
                if (dungeonState.wave < dungeonState.maxWaves) {
                    dungeonState.wave++;
                    dungeonState.status = 'WAITING_NEXT_WAVE';
                    return this.startNextWave(char, dungeonConfig);
                } else {
                    return this.completeDungeon(char, dungeonConfig);
                }
            }
        } catch (error) {
            console.error(`[DUNGEON] Error in processDungeonTick:`, error);
        }
    }

    async startNextWave(char, config) {
        const wave = char.state.dungeon.wave;
        const isBoss = wave === char.state.dungeon.maxWaves;
        let mobId = null;

        // Reset wave start time
        char.state.dungeon.wave_started_at = Date.now();

        // Wave Scaling Multiplier (Always getting stronger)
        // Wave 1: 1.0x, Wave 2: 1.1x, Wave 3: 1.2x, Wave 4: 1.3x, Boss: 1.5x (relative to base)
        const scalingFactor = isBoss ? 1.5 : (1 + (wave - 1) * 0.1);

        if (isBoss) {
            mobId = config.bossId;
            char.state.dungeon.status = 'BOSS_FIGHT';
        } else {
            const mobs = config.trashMobs;
            // Sequential selection
            mobId = mobs[wave - 1] || mobs[mobs.length - 1];
            char.state.dungeon.status = 'FIGHTING';
        }

        const baseMob = MONSTERS[config.tier].find(m => m.id === mobId);
        if (!baseMob) {
            console.error(`[DUNGEON] Mob ${mobId} not found in tier ${config.tier}`);
            char.state.dungeon.status = 'ERROR';
            return { dungeonUpdate: { status: 'ERROR', message: `Mob ${mobId} not found` } };
        }

        const scaledStats = {
            health: Math.floor(baseMob.health * scalingFactor),
            damage: Math.floor(baseMob.damage * scalingFactor),
            defense: Math.floor(baseMob.defense * scalingFactor)
        };

        console.log(`[DUNGEON] Spawning ${mobId} for ${char.name} (Wave ${wave}, Scaling: ${scalingFactor.toFixed(1)}x)`);
        try {
            await this.gameManager.combatManager.startCombat(char.user_id, mobId, config.tier, char, true, scaledStats);
        } catch (e) {
            console.error(`[DUNGEON] Failed to start combat for ${char.name}:`, e.message);
            char.state.dungeon.status = 'ERROR';
            return { dungeonUpdate: { status: 'ERROR', message: e.message } };
        }

        if (char.state.combat) {
            char.state.combat.isDungeon = true;
        }

        return {
            dungeonUpdate: {
                status: char.state.dungeon.status,
                wave: char.state.dungeon.wave,
                totalWaves: char.state.dungeon.maxWaves,
                message: isBoss ? "BOSS FIGHT STARTED!" : `Wave ${char.state.dungeon.wave} Started`
            }
        };
    }

    async completeDungeon(char, config) {
        // Grant Rewards
        const rewards = config.rewards;
        const loot = [];

        // XP
        const leveledUpCombat = this.gameManager.addXP(char, 'COMBAT', rewards.xp);
        const leveledUpDungeon = this.gameManager.addXP(char, 'DUNGEONEERING', rewards.xp);
        const leveledUp = leveledUpCombat || leveledUpDungeon;

        // Silver
        char.state.silver = (char.state.silver || 0) + rewards.silver;

        // Crest (Chance) - Boss drop only roughly, but keeping existing logic if any
        if (rewards.crest && Math.random() <= rewards.crest.chance) {
            this.gameManager.inventoryManager.addItemToInventory(char, rewards.crest.id, 1);
            loot.push(rewards.crest.id);
        }

        // Resource
        if (rewards.resource && Math.random() <= rewards.resource.chance) {
            const qty = Math.floor(Math.random() * (rewards.resource.max - rewards.resource.min + 1)) + rewards.resource.min;
            this.gameManager.inventoryManager.addItemToInventory(char, rewards.resource.id, qty);
            loot.push(`${qty}x ${rewards.resource.id}`);
        }

        // Track Persistent Stats (Dungeons)
        if (!char.state.stats) char.state.stats = {};
        char.state.stats.dungeonsCleared = (char.state.stats.dungeonsCleared || 0) + 1;

        const inventory = char.state.inventory || {};
        const mapId = config.reqItem;

        // Create Log Entry
        const logEntry = {
            id: Date.now(),
            run: (char.state.dungeon.lootLog?.length || 0) + 1,
            xp: rewards.xp,
            silver: rewards.silver,
            items: loot,
            timestamp: new Date().toISOString()
        };

        if (!char.state.dungeon.lootLog) char.state.dungeon.lootLog = [];
        char.state.dungeon.lootLog.unshift(logEntry);
        // Keep last 50 entries
        if (char.state.dungeon.lootLog.length > 50) char.state.dungeon.lootLog.pop();

        // Save to Persistent History (every individual run)
        await this.saveDungeonLog(char, config, 'COMPLETED', {
            xp: rewards.xp,
            silver: rewards.silver,
            loot: loot
        });

        // Auto-Repeat Logic
        if (char.state.dungeon.repeatCount > 0 && inventory[mapId] && inventory[mapId] >= 1) {
            // Consume Map
            this.gameManager.inventoryManager.consumeItems(char, { [mapId]: 1 });

            // Decrement Repeat Count
            char.state.dungeon.repeatCount--;

            // Reset Dungeon State for Next Run
            char.state.dungeon.wave = 1;
            char.state.dungeon.status = 'PREPARING';
            char.state.dungeon.started_at = new Date().toISOString();
            // Reset wave timer
            char.state.dungeon.wave_started_at = Date.now();

            console.log(`[DUNGEON] Auto-repeating ${config.name} for ${char.name}. Remaining: ${char.state.dungeon.repeatCount}`);

            return {
                dungeonUpdate: {
                    status: 'PREPARING',
                    message: `Dungeon Cleared! Starting next run...`,
                    rewards: { xp: rewards.xp, silver: rewards.silver, items: loot },
                    autoRepeat: true,
                    lootLog: char.state.dungeon.lootLog
                },
                leveledUp
            };
        }

        // Normal Completion (No auto-repeat or out of maps/queue)
        char.state.dungeon.status = 'COMPLETED';

        return {
            dungeonUpdate: {
                status: 'COMPLETED',
                message: `Dungeon Cleared! Rewards: ${loot.join(', ') || 'No rare drops'}`,
                rewards: { xp: rewards.xp, silver: rewards.silver, items: loot },
                lootLog: char.state.dungeon.lootLog
            },
            leveledUp
        };
    }

    async stopDungeon(userId) {
        const char = await this.gameManager.getCharacter(userId);
        if (char.state.dungeon) {
            const dungeonConfig = Object.values(DUNGEONS).find(d => d.id === char.state.dungeon.id);
            if (char.state.dungeon.status !== 'COMPLETED' && char.state.dungeon.status !== 'FAILED') {
                await this.saveDungeonLog(char, dungeonConfig, 'ABANDONED');
            }
            delete char.state.dungeon;
            if (char.state.combat) {
                delete char.state.combat;
            }
            await this.gameManager.saveState(char.id, char.state);
        }
        return { success: true, message: "Left the dungeon" };
    }

    async saveDungeonLog(char, config, outcome, runLoot = null) {
        try {
            const dungeon = char.state.dungeon;
            if (!dungeon || !config) return;

            const duration = Math.floor((Date.now() - new Date(dungeon.started_at).getTime()) / 1000);

            let totalXp = runLoot ? runLoot.xp : 0;
            let totalSilver = runLoot ? runLoot.silver : 0;
            let formattedLoot = runLoot ? runLoot.loot : [];

            // If no explicit runLoot (e.g. death or abandonment), try to sum what was gained in the session
            if (!runLoot) {
                (dungeon.lootLog || []).forEach(log => {
                    totalXp += (log.xp || 0);
                    totalSilver += (log.silver || 0);
                    (log.items || []).forEach(item => formattedLoot.push(item));
                });
            }

            const { error } = await this.gameManager.supabase.from('dungeon_history').insert({
                character_id: char.id,
                dungeon_id: dungeon.id,
                dungeon_name: config.name,
                tier: dungeon.tier,
                wave_reached: dungeon.wave,
                max_waves: dungeon.maxWaves,
                outcome: outcome,
                duration_seconds: duration,
                xp_gained: totalXp,
                silver_gained: totalSilver,
                loot_gained: formattedLoot
            });

            if (error) {
                console.error("Failed to save dungeon history:", error.message);
            }
        } catch (err) {
            console.error("Error saving dungeon history log:", err);
        }
    }
}
