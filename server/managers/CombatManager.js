import { MONSTERS } from '../../shared/monsters.js';

const MAX_XP_PER_KILL = 10_000_000; // 10M
const MAX_SILVER_PER_KILL = 100_000_000; // 100M

export class CombatManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
    }

    async startCombat(userId, characterId, mobId, tier, existingChar = null, isDungeon = false, customStats = null) {
        const char = existingChar || await this.gameManager.getCharacter(userId, characterId);

        if (char.state.dungeon && !isDungeon) {
            throw new Error("Cannot start combat while in a dungeon");
        }

        const tierNum = Number(tier);
        let mobData = null;
        if (MONSTERS[tierNum]) {
            mobData = MONSTERS[tierNum].find(m => m.id === mobId);
        }

        if (!mobData) throw new Error("Monster not found");

        if (mobData.dungeonOnly && !isDungeon) {
            throw new Error("This monster is found only in dungeons");
        }

        const userLevel = char.state.skills?.COMBAT?.level || 1;
        const requiredLevel = tier == 1 ? 1 : (tier - 1) * 10;

        if (userLevel < requiredLevel) {
            throw new Error(`Insufficient level! Requires Combat Lv ${requiredLevel}`);
        }

        const mobMaxHP = customStats?.health || mobData.health;

        char.state.combat = {
            mobId: mobData.id,
            tier: tierNum,
            mobName: mobData.name,
            mobMaxHealth: mobMaxHP,
            mobHealth: mobMaxHP,
            mobDamage: customStats?.damage || mobData.damage,
            mobDefense: customStats?.defense || mobData.defense,
            mob_next_attack_at: Date.now() + 1000,
            mobAtkSpeed: 1000, // Default mob speed
            playerHealth: char.state.health || 100,
            auto: true,
            kills: 0,
            totalPlayerDmg: 0,
            totalMobDmg: 0,
            sessionXp: 0,
            sessionSilver: 0,
            sessionLoot: {},
            started_at: new Date().toISOString()
        };
        char.last_saved = new Date().toISOString();

        await this.gameManager.saveState(char.id, char.state);
        return { success: true, message: `Combat started against ${mobData.name}` };
    }

    async stopCombat(userId, characterId) {
        const char = await this.gameManager.getCharacter(userId, characterId);
        if (char.state.combat) {
            // Save Session History
            await this.saveCombatLog(char, 'FLEE'); // Or 'STOPPED'

            delete char.state.combat;
            await this.gameManager.saveState(char.id, char.state);
        }
        return { success: true, message: "Combat ended" };
    }

    async processCombatRound(char) {
        const combat = char.state.combat;
        if (!combat) return null;

        // Legacy/Safety Init
        if (!combat.sessionLoot) combat.sessionLoot = {};
        if (typeof combat.sessionXp === 'undefined') combat.sessionXp = 0;
        if (typeof combat.sessionSilver === 'undefined') combat.sessionSilver = 0;
        if (typeof combat.totalPlayerDmg === 'undefined') combat.totalPlayerDmg = 0;
        if (typeof combat.totalMobDmg === 'undefined') combat.totalMobDmg = 0;

        const playerStats = this.gameManager.inventoryManager.calculateStats(char);
        const playerDmg = playerStats.damage;

        let mobData = null;
        const currentTier = Number(combat.tier);
        if (MONSTERS[currentTier]) {
            mobData = MONSTERS[currentTier].find(m => m.id === combat.mobId);
        }
        combat.tier = currentTier; // Sanitização em tempo de execução

        let mobDmg = combat.mobDamage;
        if (typeof mobDmg === 'undefined') {
            mobDmg = mobData ? mobData.damage : 5;
        }

        const playerMitigation = Math.min(0.60, playerStats.defense / (playerStats.defense + 2000));

        let mobDef = combat.mobDefense;
        if (typeof mobDef === 'undefined') {
            mobDef = mobData ? (mobData.defense || 0) : 0;
        }
        const mobMitigation = mobDef / (mobDef + 2000);
        const mitigatedPlayerDmg = Math.max(1, Math.floor(playerDmg * (1 - mobMitigation)));

        // Apply Player Damage
        combat.mobHealth -= mitigatedPlayerDmg;
        if (combat.mobHealth < 0) combat.mobHealth = 0;
        combat.totalPlayerDmg = (combat.totalPlayerDmg || 0) + mitigatedPlayerDmg;

        // Mob Attack Logic
        let mitigatedMobDmg = 0;
        const now = Date.now();
        if (now >= (combat.mob_next_attack_at || 0)) {
            mitigatedMobDmg = Math.max(1, Math.floor(mobDmg * (1 - playerMitigation)));
            combat.playerHealth -= mitigatedMobDmg;
            combat.totalMobDmg = (combat.totalMobDmg || 0) + mitigatedMobDmg;
            combat.mob_next_attack_at = now + (combat.mobAtkSpeed || 1000);
        }

        char.state.health = Math.max(0, combat.playerHealth);

        let roundDetails = {
            playerDmg: mitigatedPlayerDmg,
            mobDmg: mitigatedMobDmg,
            silverGained: 0,
            lootGained: [],
            xpGained: 0,
            victory: false,
            defeat: false,
            mobName: combat.mobName
        };

        let message = `Dmg: ${mitigatedPlayerDmg} | Recv: ${mitigatedMobDmg}`;
        let leveledUp = false;

        if (combat.mobHealth <= 0) {
            roundDetails.victory = true;
            message = `Defeated ${combat.mobName}!`;

            try {
                const baseXp = mobData ? mobData.xp : 10;
                const xpBonus = playerStats.globals?.xpYield || 0;
                let finalXp = Math.floor(baseXp * (1 + xpBonus / 100)); // +1% per point

                // Safety Cap
                if (finalXp > MAX_XP_PER_KILL) finalXp = MAX_XP_PER_KILL;

                leveledUp = this.gameManager.addXP(char, 'COMBAT', finalXp);
                roundDetails.xpGained = finalXp;

                // Track Persistent Stats (Kills)
                if (!char.state.stats) char.state.stats = {};
                char.state.stats.totalKills = (char.state.stats.totalKills || 0) + 1;

                let finalSilver = 0;
                if (mobData && mobData.silver) {
                    const sMin = mobData.silver[0] || 0;
                    const sMax = mobData.silver[1] || 10;
                    const baseSilver = Math.floor(Math.random() * (sMax - sMin + 1)) + sMin;

                    const silverBonus = playerStats.globals?.silverYield || 0;
                    let finalSilver = Math.floor(baseSilver * (1 + silverBonus / 100));

                    // Safety Cap
                    if (finalSilver > MAX_SILVER_PER_KILL) finalSilver = MAX_SILVER_PER_KILL;

                    char.state.silver = (char.state.silver || 0) + finalSilver;
                    roundDetails.silverGained = finalSilver;
                    message += ` [${finalSilver} Silver]`;
                }

                if (mobData && mobData.loot) {
                    const dropBonus = playerStats.globals?.dropRate || 0;
                    const dropMult = 1 + (dropBonus / 100);

                    for (const [lootId, chance] of Object.entries(mobData.loot)) {
                        if (Math.random() <= (chance * dropMult)) {
                            this.gameManager.inventoryManager.addItemToInventory(char, lootId, 1);
                            roundDetails.lootGained.push(lootId);
                            message += ` [Item: ${lootId}]`;

                            // Accumulate Session Loot
                            if (!combat.sessionLoot) combat.sessionLoot = {};
                            combat.sessionLoot[lootId] = (combat.sessionLoot[lootId] || 0) + 1;
                        }
                    }
                }

                // Accumulate Session Stats
                combat.sessionXp = (combat.sessionXp || 0) + finalXp;
                combat.sessionSilver = (combat.sessionSilver || 0) + (finalSilver || 0);

            } catch (err) {
            }

            if (combat.isDungeon) {
                delete char.state.combat;
            } else {
                combat.kills = (combat.kills || 0) + 1;
                // combat.mobHealth = combat.mobMaxHealth; // REMOVED: Managed by GameManager with delay
            }
        }

        if (combat.playerHealth <= 0) {
            roundDetails.defeat = true;
            message = "You died!";

            // Save History (Session end)
            await this.saveCombatLog(char, 'DEFEAT');

            delete char.state.combat;
        }

        return { message, leveledUp, details: roundDetails };
    }

    async saveCombatLog(char, outcome) {
        try {
            const combat = char.state.combat;
            if (!combat) return;

            const duration = Math.floor((Date.now() - new Date(combat.started_at).getTime()) / 1000);

            // Format loot for storage
            const formattedLoot = [];
            for (const [itemId, qty] of Object.entries(combat.sessionLoot || {})) {
                formattedLoot.push(`${qty}x ${itemId}`);
            }

            const { error } = await this.gameManager.supabase.from('combat_history').insert({
                character_id: char.id,
                mob_id: combat.mobId,
                mob_name: combat.mobName,
                outcome: outcome,
                duration_seconds: duration,
                xp_gained: combat.sessionXp || 0,
                silver_gained: combat.sessionSilver || 0,
                loot_gained: formattedLoot,
                damage_dealt: combat.totalPlayerDmg || 0,
                damage_taken: combat.totalMobDmg || 0,
                kills: combat.kills || 0
            });

            if (error) {
                console.error("Failed to save combat history:", error.message);
            }

            // Send System Notification
            this.gameManager.addActionSummaryNotification(char, 'Combat', {
                itemsGained: combat.sessionLoot || {},
                xpGained: { COMBAT: combat.sessionXp || 0 },
                totalTime: duration,
                kills: combat.kills || 0,
                silverGained: combat.sessionSilver || 0
            });

        } catch (err) {
            console.error("Error saving combat history log:", err);
        }
    }
}
