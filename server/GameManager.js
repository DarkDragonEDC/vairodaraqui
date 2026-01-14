import { ITEMS, QUALITIES } from './data/items.js';
import { MONSTERS } from './data/monsters.js';
import { INITIAL_SKILLS, calculateNextLevelXP } from './data/skills.js';


// Flatten ITEMS for easy lookup
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
    }

    // Helper para resolver item com qualidade (Normal, Good, etc)
    resolveItem(id) {
        if (!id) return null;
        if (ITEM_LOOKUP[id]) return ITEM_LOOKUP[id];

        // Tenta remover sufixo _Qx
        const separatorIndex = id.lastIndexOf('_Q');
        if (separatorIndex === -1) return null;

        const baseId = id.substring(0, separatorIndex);
        const qualityIndex = parseInt(id.substring(separatorIndex + 2));
        const baseItem = ITEM_LOOKUP[baseId];

        if (!baseItem || !QUALITIES[qualityIndex]) return null;

        return {
            ...baseItem,
            name: `${QUALITIES[qualityIndex].name} ${baseItem.name}`,
            ip: (baseItem.ip || 0) + QUALITIES[qualityIndex].ipBonus,
            quality: qualityIndex,
            rarityColor: QUALITIES[qualityIndex].color,
            originalId: id // Para fins de debug/tracking
        };
    }

    async getCharacter(userId, catchup = false) {
        const { data, error } = await this.supabase
            .from('characters')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        // Se o personagem existe, garantimos que ele tem toda a estrutura necessária
        if (data && data.state) {
            let updated = false;

            // Garantir Skills
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

            // Garantir Stats Zerados
            if (!data.state.stats) {
                data.state.stats = { str: 0, agi: 0, int: 0 };
                updated = true;
            }

            // --- LÓGICA DE GANHOS OFFLINE (CATCH-UP) ---
            // DEBUG: Log check for catchup
            // console.log(`[DEBUG] Checking catchup for ${data.name}. Active: ${!!data.current_activity}`);
            if (catchup && data.current_activity && data.activity_started_at) {
                const now = new Date();
                const lastSaved = data.last_saved ? new Date(data.last_saved).getTime() : new Date(data.activity_started_at).getTime();
                const elapsedSeconds = (now.getTime() - lastSaved) / 1000;
                const timePerAction = data.current_activity.time_per_action || 3;

                if (elapsedSeconds >= timePerAction) {
                    const actionsPossible = Math.floor(elapsedSeconds / timePerAction);
                    const actionsToProcess = Math.min(actionsPossible, data.current_activity.actions_remaining);

                    if (actionsToProcess > 0) {
                        console.log(`Processing offline catch-up for ${data.name}: ${actionsToProcess} actions`);
                        // Capture the report of offline actions
                        const offlineReport = await this.processBatchActions(data, actionsToProcess);

                        // Attach report to character data to be sent to frontend ONE TIME
                        // The frontend should handle displaying this and then it's gone from the session 
                        // unless we store it in DB, but fleeting is fine for now.
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
        const { type, item_id } = char.current_activity;
        const item = ITEM_LOOKUP[item_id];
        if (!item) return { processed: 0, itemsGained: {}, xpGained: {} };

        let processed = 0;
        let leveledUp = false;

        // Report structures
        const itemsGained = {};
        const xpGained = {};

        for (let i = 0; i < quantity; i++) {
            let result = null;
            switch (type) {
                case 'GATHERING': result = await this.processGathering(char, item); break;
                case 'REFINING': result = await this.processRefining(char, item); break;
                case 'CRAFTING': result = await this.processCrafting(char, item); break;
            }

            if (result && !result.error) {
                processed++;
                if (result.leveledUp) leveledUp = true;

                // Track Items
                if (result.itemGained) {
                    itemsGained[result.itemGained] = (itemsGained[result.itemGained] || 0) + (result.amountGained || 1);
                }

                // Track XP (Simple extraction from loop or result)
                // Note: processGathering/etc don't explicitly return XP amount, just "leveledUp".
                // We might want to improve this, but for now we can infer or strict add.
                // Actually, let's update processGathering etc to return xpAmount.
                if (result.xpGained) {
                    xpGained[result.skillKey] = (xpGained[result.skillKey] || 0) + result.xpGained;
                }

            } else {
                break; // Stop if ingredient runs out or inventory full
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
        // Verificar se já existe (limite de 1 personagem)
        const existing = await this.getCharacter(userId);
        if (existing) throw new Error("Você já possui um personagem");

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

        if (error) {
            console.error("Erro ao criar personagem:", error);
            throw new Error(error.message || 'Erro ao criar personagem');
        }
        return data;
    }



    async claimReward(userId) {
        // Apenas um stub para ser implementado depois
        return { success: true, message: "Funcionalidade registrada (Names Mode)" };
    }

    async getLeaderboard() {
        const { data, error } = await this.supabase
            .from('characters')
            .select('id, name, state')
            .limit(100);

        if (error) {
            console.error('Erro ao buscar ranking:', error);
            return [];
        }
        return data || [];
    }

    async startActivity(userId, actionType, itemId, quantity = 1) {
        const type = actionType.toUpperCase();
        console.log(`Starting activity: ${type} for ${userId}`);
        const char = await this.getCharacter(userId);
        const item = ITEM_LOOKUP[itemId];
        if (!item) throw new Error("Item não encontrado");

        // Validação de Nível por Tier
        const skillKey = this.getSkillKeyForActivity(type, itemId);
        const userLevel = char.state.skills[skillKey]?.level || 1;
        const requiredLevel = item.tier === 1 ? 1 : (item.tier - 1) * 10;

        if (userLevel < requiredLevel) {
            throw new Error(`Nível insuficiente! Requer ${skillKey} Lv ${requiredLevel}`);
        }

        // --- CÁLCULO DE TEMPO POR AÇÃO ---
        let baseTime = 3; // Default
        if (type === 'GATHERING') baseTime = 2.0;
        else if (type === 'REFINING') baseTime = 1.5;
        else if (type === 'CRAFTING') baseTime = 4.0;
        else if (type === 'COOKING') baseTime = 3.0;

        const timePerAction = baseTime;

        const totalDuration = timePerAction * quantity;
        if (totalDuration > 43200) {
            throw new Error("Duração máxima excedida (Limite: 12 Horas)");
        }

        const { error } = await this.supabase
            .from('characters')
            .update({
                current_activity: {
                    type: type,
                    item_id: itemId,
                    actions_remaining: quantity,
                    initial_quantity: quantity,
                    time_per_action: timePerAction,
                    next_action_at: Date.now() + (timePerAction * 1000),
                    req: item.req || null
                },
                activity_started_at: new Date().toISOString()
            })
            .eq('id', char.id);

        if (error) throw error;
        return { success: true, actionType, itemId, quantity, timePerAction };
    }

    async startCombat(userId, mobId, tier) {
        console.log(`Starting combat: ${mobId} (T${tier}) for ${userId}`);
        const char = await this.getCharacter(userId);

        // Find mob data
        let mobData = null;
        if (MONSTERS[tier]) {
            mobData = MONSTERS[tier].find(m => m.id === mobId);
        }

        if (!mobData) throw new Error("Monstro não encontrado");

        // Validação de Nível por Tier
        const userLevel = char.state.skills?.COMBAT?.level || 1;
        const requiredLevel = tier == 1 ? 1 : (tier - 1) * 10;

        if (userLevel < requiredLevel) {
            throw new Error(`Nível insuficiente! Requer Combate Lv ${requiredLevel}`);
        }

        // Initialize combat state in char.state.combat
        // We use a simplified state for now
        char.state.combat = {
            mobId: mobData.id,
            tier: tier,
            mobName: mobData.name,
            mobMaxHealth: mobData.health,
            mobHealth: mobData.health,
            playerHealth: char.state.health || 100, // Sync with main health
            auto: true,
            started_at: new Date().toISOString()
        };

        await this.saveState(char.id, char.state);
        return { success: true, message: `Combate iniciado contra ${mobData.name}` };
    }

    async stopCombat(userId) {
        const char = await this.getCharacter(userId);
        if (char.state.combat) {
            delete char.state.combat;
            await this.saveState(char.id, char.state);
        }
        return { success: true, message: "Combate encerrado" };
    }

    calculateStats(char) {
        if (!char?.state?.skills) return { str: 0, agi: 0, int: 0, maxHP: 100, damage: 5, defense: 0, dmgBonus: 0 };
        const skills = char.state.skills;
        const equipment = char.state.equipment || {};

        let str = 0;
        let agi = 0;
        let int = 0;

        const getLvl = (key) => (skills[key]?.level || 1);

        str += getLvl('ORE_MINER');
        str += getLvl('METAL_BAR_REFINER');
        str += getLvl('WARRIOR_CRAFTER');

        agi += getLvl('ANIMAL_SKINNER');
        agi += getLvl('LEATHER_REFINER');
        agi += getLvl('HUNTER_CRAFTER');

        int += getLvl('FIBER_HARVESTER');
        int += getLvl('LUMBERJACK');
        int += getLvl('CLOTH_REFINER');
        int += getLvl('PLANK_REFINER');
        int += getLvl('MAGE_CRAFTER');
        int += getLvl('COOKING');
        int += getLvl('FISHING');

        let gearHP = 0;
        let gearDamage = 0;
        let gearDefense = 0;
        let gearDmgBonus = 0;

        Object.values(equipment).forEach(item => {
            if (item && item.stats) {
                if (item.stats.hp) gearHP += item.stats.hp;
                if (item.stats.damage) gearDamage += item.stats.damage;
                if (item.stats.defense) gearDefense += item.stats.defense;
                if (item.stats.dmgBonus) gearDmgBonus += item.stats.dmgBonus;
            }
        });

        // IP Bonus for Weapon
        const weapon = equipment.mainHand;
        const ipBonus = weapon ? (weapon.ip || 0) / 10 : 0;

        return {
            str, agi, int,
            maxHP: 100 + (str * 10) + gearHP,
            damage: Math.floor((5 + (str * 1) + gearDamage + ipBonus) * (1 + gearDmgBonus)),
            defense: gearDefense,
            dmgBonus: gearDmgBonus
        };
    }

    getSkillKeyForActivity(type, itemId) {
        switch (type) {
            case 'GATHERING': return this.getSkillKeyForResource(itemId);
            case 'REFINING': return this.getSkillKeyForRefining(itemId);
            case 'CRAFTING': return this.getSkillKeyForCrafting(itemId);
            default: return null;
        }
    }

    async saveState(charId, state) {
        const { error } = await this.supabase
            .from('characters')
            .update({ state })
            .eq('id', charId);
        if (error) throw error;
    }

    async updateDungeonAndState(charId, state, dungeonState) {
        const { error } = await this.supabase
            .from('characters')
            .update({
                state: state,
                dungeon_state: dungeonState,
                current_activity: null,
                activity_started_at: null
            })
            .eq('id', charId);
        if (error) throw error;
    }

    async startDungeon(userId, tier) {
        // Apenas registra a intenção de dungeon
        return { success: true, message: `Dungeon Tier ${tier} registrada` };
    }

    async equipItem(userId, itemId) {
        const char = await this.getCharacter(userId);
        const item = this.resolveItem(itemId);
        if (!item) throw new Error("Item não encontrado");

        // Validar se é um equipamento
        const validSlots = ['WEAPON', 'ARMOR', 'HELMET', 'BOOTS', 'GLOVES', 'CAPE', 'OFF_HAND', 'TOOL', 'TOOL_AXE', 'TOOL_PICKAXE', 'TOOL_KNIFE', 'TOOL_SICKLE', 'TOOL_ROD', 'FOOD'];
        if (!validSlots.includes(item.type)) {
            throw new Error("Este item não pode ser equipado");
        }

        const state = char.state;

        // Verificar se tem no inventário
        if (!state.inventory[itemId] || state.inventory[itemId] < 1) {
            throw new Error("Você não possui este item");
        }

        // Mapear item.type para slots do equipment
        let slotName = '';
        switch (item.type) {
            case 'WEAPON': slotName = 'mainHand'; break;
            case 'OFF_HAND': slotName = 'offHand'; break;
            case 'ARMOR': slotName = 'chest'; break;
            case 'HELMET': slotName = 'head'; break;
            case 'BOOTS': slotName = 'shoes'; break;
            case 'GLOVES': slotName = 'gloves'; break;
            case 'CAPE': slotName = 'cape'; break;
            case 'TOOL': slotName = 'tool'; break; // Legacy support
            case 'TOOL_AXE': slotName = 'tool_axe'; break;
            case 'TOOL_PICKAXE': slotName = 'tool_pickaxe'; break;
            case 'TOOL_KNIFE': slotName = 'tool_knife'; break;
            case 'TOOL_SICKLE': slotName = 'tool_sickle'; break;
            case 'TOOL_ROD': slotName = 'tool_rod'; break;
            case 'FOOD': slotName = 'food'; break;
            default: throw new Error("Tipo de slot desconhecido");
        }

        if (!state.equipment) state.equipment = {};

        if (slotName === 'food') {
            // Lógica Especial para Comida (Stack)
            const amount = state.inventory[itemId];
            delete state.inventory[itemId];

            const currentEquip = state.equipment.food;
            if (currentEquip) {
                if (currentEquip.id === itemId) {
                    // Mesmo item: soma
                    currentEquip.amount = (currentEquip.amount || 0) + amount;
                } else {
                    // Item diferente: Devolve o antigo e subititui
                    const oldId = currentEquip.originalId || currentEquip.id;
                    const oldAmount = currentEquip.amount || 1;
                    state.inventory[oldId] = (state.inventory[oldId] || 0) + oldAmount;
                    state.equipment.food = { ...item, amount: amount };
                }
            } else {
                // Equipa novo com quantidade
                state.equipment.food = { ...item, amount: amount };
            }
        } else {
            // Lógica Padrão (1 item)
            state.inventory[itemId]--;
            if (state.inventory[itemId] <= 0) delete state.inventory[itemId];

            const currentEquip = state.equipment[slotName];
            if (currentEquip && currentEquip.id) {
                const oldId = currentEquip.originalId || currentEquip.id;
                state.inventory[oldId] = (state.inventory[oldId] || 0) + 1;
            }

            state.equipment[slotName] = item;
        }

        // Recalcular status se necessário (não implementado full ainda) ver calc damage

        // Salvar estado
        await this.saveState(char.id, state);
        return { success: true, message: `${item.name} equipado!` };
    }

    async unequipItem(userId, slotName) {
        const char = await this.getCharacter(userId);
        if (!char) throw new Error("Character not found");

        const state = char.state;

        if (!state.equipment || !state.equipment[slotName]) {
            throw new Error("Slot vazio ou inválido");
        }

        const item = state.equipment[slotName];

        // Return to inventory
        const amount = item.amount || 1;
        const returnId = item.originalId || item.id;
        state.inventory[returnId] = (state.inventory[returnId] || 0) + amount;

        // Clear slot
        delete state.equipment[slotName];

        await this.saveState(char.id, state);
        return { success: true, message: "Item desequipado", state };
    }


    async getStatus(userId, catchup = false) {
        const char = await this.getCharacter(userId, catchup);
        if (!char) return { noCharacter: true };

        const stats = this.calculateStats(char);

        return {
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
    }

    // --- LÓGICA DE TICK / PROCESSAMENTO ---

    async processTick(userId) {
        const char = await this.getCharacter(userId);
        if (!char) return null;

        let foodUsed = this.processFood(char);

        if (!char.current_activity && !char.state.combat && !foodUsed) return null;

        const now = Date.now();
        let leveledUp = false;
        let itemsGained = 0;
        let lastActivityResult = null;
        let combatResult = null;
        let activityFinished = false;

        // 1. Processar Atividade (Coleta, Refino, Craft)
        if (char.current_activity) {
            const { type, item_id, actions_remaining, time_per_action = 3, next_action_at } = char.current_activity;

            // console.log(`[PROCESS-TICK] User ${char.name} has active ${type}. Remaining: ${actions_remaining}`);

            // Compatibilidade: Se não tiver next_action_at (velho), define agora
            let targetTime = Number(next_action_at);
            if (!targetTime) {
                targetTime = now + (time_per_action * 1000);
                char.current_activity.next_action_at = targetTime;
            }

            // Verifica se está na hora de processar
            if (now >= targetTime) {
                console.log(`[PROCESS-TICK] Time reached for ${char.name}. Target: ${targetTime}, Now: ${now}`);
                const item = ITEM_LOOKUP[item_id];

                if (item && actions_remaining > 0) {
                    let result = null;
                    const normalizedType = type.toUpperCase();
                    switch (normalizedType) {
                        case 'GATHERING': result = await this.processGathering(char, item); break;
                        case 'REFINING': result = await this.processRefining(char, item); break;
                        case 'CRAFTING': result = await this.processCrafting(char, item); break;
                    }

                    // Atualiza próximo tempo usando o tempo alvo anterior para evitar drift
                    // Mas garante que não seja menor que 'agora' se houve lag grande (exceto se quisermos catchup rápido)
                    // Vamos permitir catchup simples acelerado no próximo tick se estiver muito atrasado
                    char.current_activity.next_action_at = targetTime + (time_per_action * 1000);

                    // Se o atraso for muito grande (ex: servidor travou), ajusta para agora para não processar 1000 itens de uma vez no loop (segurança)
                    if (now - char.current_activity.next_action_at > 5000) {
                        char.current_activity.next_action_at = now + (time_per_action * 1000);
                    }

                    if (result && !result.error) {
                        itemsGained++;
                        if (result.leveledUp) leveledUp = true;
                        lastActivityResult = result;

                        const newActionsRemaining = actions_remaining - 1;
                        activityFinished = newActionsRemaining <= 0;
                        if (activityFinished) {
                            char.current_activity = null;
                            char.activity_started_at = null;
                        } else {
                            char.current_activity.actions_remaining = newActionsRemaining;
                            console.log(`[PROCESS-TICK] Action processed for ${char.name}. Remaining: ${newActionsRemaining}`);
                        }
                    } else {
                        // Se deu erro (inventário cheio, etc), para.
                        lastActivityResult = result;
                        char.current_activity = null; // Para atividade em erro
                    }
                }
            }
        }

        // 2. Processar Combate
        if (char.state.combat) {
            // Inicializa next_attack_at
            if (!char.state.combat.next_attack_at) {
                // Ataque inicial imediato ou delay? Vamos dar um delay pequeno
                char.state.combat.next_attack_at = now + 1000;
            }

            if (now >= char.state.combat.next_attack_at) {
                combatResult = await this.processCombatRound(char);
                // Standardized combat round time: 1.5s
                char.state.combat.next_attack_at = now + 1500;

                if (combatResult && combatResult.leveledUp) leveledUp = true;
            }
        }

        // 3. Salvar Estado no Banco (apenas se houve mudança significativa ou intervalo de save)
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

        // SEMPRE retorna o status se houver atividade ativa ou combate, 
        // para o ticker do server avisar o client (importante para barras de progresso suaves)
        if (char.current_activity || char.state.combat || itemsGained > 0 || combatResult) {
            return {
                success: true,
                message: lastActivityResult?.message || combatResult?.message || (foodUsed ? "Usou comida" : ""),
                leveledUp,
                activityFinished,
                combatUpdate: combatResult,
                status: {
                    user_id: char.user_id,
                    name: char.name,
                    state: char.state,
                    current_activity: char.current_activity,
                    activity_started_at: char.activity_started_at,
                    dungeon_state: char.dungeon_state,
                    serverTime: Date.now()
                }
            };
        }

        return lastActivityResult || combatResult;
    }

    async processCombatRound(char) {
        const combat = char.state.combat;
        if (!combat) return null;

        // 1. Calculate Player Damage using centralized logic
        const playerStats = this.calculateStats(char);
        const playerDmg = playerStats.damage;

        // 2. Calculate Mob Damage & Stats
        let mobData = null;
        if (MONSTERS[combat.tier]) {
            mobData = MONSTERS[combat.tier].find(m => m.id === combat.mobId);
        }
        let mobDmg = mobData ? mobData.damage : 5;

        // Player Defense mitigation
        let playerDef = 0;
        if (char.state.equipment) {
            if (char.state.equipment.chest) playerDef += (char.state.equipment.chest.stats?.defense || 0);
            if (char.state.equipment.head) playerDef += (char.state.equipment.head.stats?.defense || 0);
            if (char.state.equipment.shoes) playerDef += (char.state.equipment.shoes.stats?.defense || 0);
        }

        // Simple mitigation: Damage reduction percent or flat? 
        // Let's do flat reduction with a cap (min 1 dmg)
        const mitigatedMobDmg = Math.max(1, mobDmg - Math.floor(playerDef / 2));

        // 3. Apply Damage
        combat.mobHealth -= playerDmg;
        combat.playerHealth -= mitigatedMobDmg;

        // Update main health too
        char.state.health = Math.max(0, combat.playerHealth);

        let roundDetails = {
            playerDmg,
            mobDmg: mitigatedMobDmg,
            silverGained: 0,
            lootGained: [],
            xpGained: 0,
            victory: false,
            defeat: false,
            mobName: combat.mobName
        };

        let message = `Dmg: ${playerDmg} | Recebeu: ${mitigatedMobDmg}`;
        let leveledUp = false;

        // 4. Check Death
        if (combat.mobHealth <= 0) {
            roundDetails.victory = true;
            message = `Matou ${combat.mobName}!`;

            // Rewards
            const xp = mobData ? mobData.xp : 10;
            leveledUp = this.addXP(char, 'COMBAT', xp);
            roundDetails.xpGained = xp;

            // Silver Gain
            if (mobData && mobData.silver) {
                const sMin = mobData.silver[0] || 0;
                const sMax = mobData.silver[1] || 10;
                const sGain = Math.floor(Math.random() * (sMax - sMin + 1)) + sMin;
                char.state.silver = (char.state.silver || 0) + sGain;
                roundDetails.silverGained = sGain;
                message += ` [${sGain} Silver]`;
            }

            // Loot
            if (mobData && mobData.loot) {
                for (const [lootId, chance] of Object.entries(mobData.loot)) {
                    if (Math.random() <= chance) {
                        this.addItemToInventory(char, lootId, 1);
                        roundDetails.lootGained.push(lootId);
                        message += ` [Item: ${lootId}]`;
                    }
                }
            }

            // Respawn (Auto Battle)
            combat.mobHealth = combat.mobMaxHealth;
        }

        if (combat.playerHealth <= 0) {
            roundDetails.defeat = true;
            message = "Você morreu!";
            delete char.state.combat;
        }

        return { message, leveledUp, details: roundDetails };
    }

    getMaxHealth(char) {
        const vit = char.state.stats?.vit || 0;
        // Base HP 100 + 10 por Vitalidade + Bonus de Equipamento (TODO)
        // Por enquanto simples:
        return 100 + (vit * 10);
    }

    processFood(char) {
        if (!char.state.equipment || !char.state.equipment.food) return false;

        const food = char.state.equipment.food;
        if (!food.heal || !food.amount) return false;

        const maxHp = this.getMaxHealth(char);
        const currentHp = char.state.health || 0;
        const missing = maxHp - currentHp;

        // Regra: se food cura 100, só usa se faltar 101 ou mais (missing > heal)
        if (missing > food.heal) {
            char.state.health = currentHp + food.heal;
            if (char.state.health > maxHp) char.state.health = maxHp;

            // Sincronizar combate se estiver ativo
            if (char.state.combat) {
                char.state.combat.playerHealth = char.state.health;
            }

            food.amount--;
            if (food.amount <= 0) {
                delete char.state.equipment.food;
                return 'consumed_all'; // Indication
            }
            return true; // Used
        }
        return false;
    }

    async stopActivity(charId) {
        await this.supabase
            .from('characters')
            .update({ current_activity: null, activity_started_at: null })
            .eq('id', charId);
    }

    async processGathering(char, item) {
        // Coleta dá o item e XP
        const added = this.addItemToInventory(char, item.id, 1);
        if (!added) return { error: "Inventário Cheio" };

        const skillKey = this.getSkillKeyForResource(item.id);
        const xpAmount = item.xp || 5;
        const leveledUp = this.addXP(char, skillKey, xpAmount);

        return {
            success: true,
            message: `Coletou ${item.name}`,
            leveledUp,
            itemGained: item.id,
            amountGained: 1,
            skillKey,
            xpGained: xpAmount
        };
    }

    async processRefining(char, item) {
        // Refino consome ingredientes
        if (!this.hasItems(char, item.req)) return { error: "Ingredientes insuficientes" };

        // Check space BEFORE consuming (if output is new item)
        // But simplified: 
        const added = this.addItemToInventory(char, item.id, 1);
        if (!added) return { error: "Inventário Cheio" };

        this.consumeItems(char, item.req);
        // Assuming addItemToInventory result from check above was actually adding?
        // Wait, my addItemToInventory logic (to be written) will ADD if true.
        // So we consumed AFTER adding? That's fine if we have space. 
        // Realistically we should check space, then consume, then add.
        // But for this simple logic:
        // Try Add -> If Success -> Consume.
        // If fail -> Don't consume.
        // The implementation below assumes addItemToInventory adds immediately.
        // So I should consume AFTER checking but BEFORE returning?
        // Actually, if addItemToInventory adds, and then we consume, we are safe.

        const skillKey = this.getSkillKeyForRefining(item.id);
        const xpAmount = item.xp || 10;
        const leveledUp = this.addXP(char, skillKey, xpAmount);

        return {
            success: true,
            message: `Refinou ${item.name}`,
            leveledUp,
            itemGained: item.id,
            amountGained: 1,
            skillKey,
            xpGained: xpAmount
        };
    }

    async processCrafting(char, item) {
        // Craft consome ingredientes
        if (!this.hasItems(char, item.req)) return { error: "Materiais insuficientes" };

        // Quality Logic
        let finalItemId = item.id;
        let qualityName = '';
        const equippableTypes = ['WEAPON', 'ARMOR', 'HELMET', 'BOOTS', 'GLOVES', 'CAPE', 'OFF_HAND', 'TOOL'];

        if (equippableTypes.includes(item.type)) {
            const rand = Math.random();
            let quality = 0;

            if (rand > 0.999) quality = 4; // Masterpiece (0.1%)
            else if (rand > 0.99) quality = 3; // Excellent (1%)
            else if (rand > 0.90) quality = 2; // Outstanding (9%)
            else if (rand > 0.70) quality = 1; // Good (20%)

            if (quality > 0) {
                finalItemId += QUALITIES[quality].suffix;
                qualityName = `[${QUALITIES[quality].name}] `;
            }
        }

        const added = this.addItemToInventory(char, finalItemId, 1);
        if (!added) return { error: "Inventário Cheio" };

        this.consumeItems(char, item.req);

        const skillKey = this.getSkillKeyForCrafting(item.id);
        const xpAmount = item.xp || 50;
        const leveledUp = this.addXP(char, skillKey, xpAmount);

        return {
            success: true,
            message: `Fabricou ${qualityName}${item.name}`,
            leveledUp,
            itemGained: finalItemId,
            amountGained: 1,
            skillKey,
            xpGained: xpAmount
        };
    }

    // --- AUXILIARES ---

    addItemToInventory(char, itemId, amount) {
        if (!char.state.inventory) char.state.inventory = {};
        const inv = char.state.inventory;

        // Check Limit (50 Slots)
        // If item NOT in inventory, check free slots
        if (!inv[itemId]) {
            if (Object.keys(inv).length >= 50) {
                return false; // Inventário Cheio
            }
        }

        inv[itemId] = (inv[itemId] || 0) + amount;
        if (inv[itemId] <= 0) delete inv[itemId];
        return true;
    }

    hasItems(char, req) {
        if (!req) return true;
        const inv = char.state.inventory;
        return Object.entries(req).every(([id, amount]) => (inv[id] || 0) >= amount);
    }

    consumeItems(char, req) {
        if (!req) return;
        const inv = char.state.inventory;
        Object.entries(req).forEach(([id, amount]) => {
            inv[id] -= amount;
            if (inv[id] <= 0) delete inv[id];
        });
    }

    addXP(char, skillKey, amount) {
        if (!skillKey || !char.state.skills[skillKey]) return false;

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
        return leveledUp;
    }

    getSkillKeyForResource(itemId) {
        if (itemId.includes('WOOD')) return 'LUMBERJACK';
        if (itemId.includes('ORE')) return 'ORE_MINER';
        if (itemId.includes('HIDE')) return 'ANIMAL_SKINNER';
        if (itemId.includes('FIBER')) return 'FIBER_HARVESTER';
        if (itemId.includes('FISH')) return 'FISHING';
        return null;
    }

    getSkillKeyForRefining(itemId) {
        if (itemId.includes('PLANK')) return 'PLANK_REFINER';
        if (itemId.includes('BAR')) return 'METAL_BAR_REFINER';
        if (itemId.includes('LEATHER')) return 'LEATHER_REFINER';
        if (itemId.includes('CLOTH')) return 'CLOTH_REFINER';
        return null;
    }

    getSkillKeyForCrafting(itemId) {
        if (itemId.includes('SWORD') || itemId.includes('PLATE') || itemId.includes('PICKAXE') || itemId.includes('SHIELD')) return 'WARRIOR_CRAFTER';
        if (itemId.includes('BOW') || itemId.includes('LEATHER') || itemId.includes('AXE') || itemId.includes('TORCH')) return 'HUNTER_CRAFTER';
        if (itemId.includes('STAFF') || itemId.includes('CLOTH') || itemId.includes('SICKLE') || itemId.includes('TOME')) return 'MAGE_CRAFTER';
        if (itemId.includes('FOOD')) return 'COOKING';
        if (itemId.includes('CAPE')) return 'WARRIOR_CRAFTER'; // Capas geralmente vinculadas ao Warrior no mob ou Global
        return null;
    }
    async getMarketListings(filters = {}) {
        let query = this.supabase
            .from('market_listings')
            .select('*')
            .order('created_at', { ascending: false });

        if (filters.tier) query = query.eq('item_data->>tier', filters.tier.toString());
        if (filters.type) query = query.eq('item_data->>type', filters.type.toUpperCase());
        if (filters.search) query = query.ilike('item_id', `%${filters.search}%`);

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    async sellItem(userId, itemId, quantity) {
        if (!quantity || quantity <= 0) throw new Error("Quantidade inválida");

        const char = await this.getCharacter(userId);
        if (!char) throw new Error("Personagem não encontrado");

        const inventory = char.state.inventory;
        if (!inventory[itemId] || inventory[itemId] < quantity) {
            throw new Error("Quantidade insuficiente no inventário");
        }

        const itemData = this.resolveItem(itemId);
        if (!itemData) throw new Error("Item inválido");

        // Calculate Price: Tier * 5 (Simple Economy)
        const pricePerUnit = (itemData.tier || 1) * 5;
        const totalSilver = pricePerUnit * quantity;

        // Transaction
        inventory[itemId] -= quantity;
        if (inventory[itemId] <= 0) delete inventory[itemId];

        char.state.silver = (char.state.silver || 0) + totalSilver;

        await this.saveState(userId, char.state);
        return { success: true, message: `Vendeu ${quantity}x ${itemData.name} por ${totalSilver} Silver` };
    }

    async listMarketItem(userId, itemId, amount, price) {
        if (!amount || amount <= 0) throw new Error("Quantidade inválida");
        if (!price || price <= 0) throw new Error("Preço inválido");

        const char = await this.getCharacter(userId);
        if (!char) throw new Error("Personagem não encontrado");

        const inventory = char.state.inventory;
        if (!inventory[itemId] || inventory[itemId] < amount) {
            throw new Error("Quantidade insuficiente no inventário");
        }

        const itemData = this.resolveItem(itemId);
        if (!itemData) throw new Error("Item inválido");

        // Transação: Remover do inventário e adicionar ao mercado
        inventory[itemId] -= amount;
        if (inventory[itemId] <= 0) delete inventory[itemId];

        const { error: insertError } = await this.supabase
            .from('market_listings')
            .insert({
                seller_id: userId,
                seller_name: char.name,
                item_id: itemId,
                item_data: itemData,
                amount: amount,
                price: price
            });

        if (insertError) {
            // Rollback manual (simplificado)
            inventory[itemId] = (inventory[itemId] || 0) + amount;
            throw insertError;
        }

        await this.saveState(userId, char.state);
        return { success: true, message: `Item listado com sucesso!` };
    }

    async buyMarketItem(buyerId, listingId) {
        const buyer = await this.getCharacter(buyerId);
        if (!buyer) throw new Error("Personagem comprador não encontrado");

        // 1. Buscar a listagem
        const { data: listing, error: fetchError } = await this.supabase
            .from('market_listings')
            .select('*')
            .eq('id', listingId)
            .single();

        if (fetchError || !listing) throw new Error("Oferta não encontrada ou já expirou");

        if (listing.seller_id === buyerId) throw new Error("Você não pode comprar seu próprio item");

        const totalPrice = listing.price;
        if ((buyer.state.silver || 0) < totalPrice) throw new Error("Prata insuficiente");

        // 2. Transação Atômica (Dedução de Prata e Remoção da Listagem)
        // Como o JS não tem transações atômicas fáceis entre tabelas aqui sem RPC,
        // vamos fazer em ordem segura.

        // a) Remover listagem primeiro (garantir que ninguém mais compre)
        const { error: deleteError } = await this.supabase
            .from('market_listings')
            .delete()
            .eq('id', listingId);

        if (deleteError) throw deleteError;

        // b) Atualizar Comprador (Prata deduzida, Item vai para CLAIM)
        buyer.state.silver -= totalPrice;
        this.addClaim(buyer, {
            type: 'BOUGHT_ITEM',
            itemId: listing.item_id,
            amount: listing.amount,
            name: listing.item_data.name,
            timestamp: Date.now()
        });
        await this.saveState(buyerId, buyer.state);

        // c) Atualizar Vendedor (Prata com taxa vai para CLAIM)
        let seller = this.characters[listing.seller_id];
        let sellerFromDb = false;

        if (!seller) {
            const { data, error } = await this.supabase
                .from('characters')
                .select('*')
                .eq('id', listing.seller_id)
                .single();

            if (data && !error) {
                seller = data;
                sellerFromDb = true;
            }
        }

        if (seller) {
            const tax = Math.floor(totalPrice * 0.06);
            const sellerProfit = totalPrice - tax;

            if (!seller.state.claims) seller.state.claims = [];
            seller.state.claims.push({
                id: Date.now().toString() + Math.random().toString().slice(2, 6),
                type: 'SOLD_ITEM',
                silver: sellerProfit,
                item: listing.item_data.name,
                amount: listing.amount,
                timestamp: Date.now()
            });

            if (sellerFromDb) {
                await this.supabase
                    .from('characters')
                    .update({ state: seller.state })
                    .eq('id', listing.seller_id);
            } else {
                await this.saveState(listing.seller_id, seller.state);
                // Opcional: Notificar vendedor se estiver online
                // const sellerSocket = ... (se tiver mapa de sockets)
            }
        }
        return { success: true, message: `Compra realizada! Item enviado para aba Coletar.` };
    }

    async cancelMarketListing(userId, listingId) {
        // 1. Buscar e Verificar
        const { data: listing, error: fetchError } = await this.supabase
            .from('market_listings')
            .select('*')
            .eq('id', listingId)
            .single();

        if (fetchError || !listing) throw new Error("Listagem não encontrada");
        if (listing.seller_id !== userId) throw new Error("Permissão negada");

        // 2. Remover
        const { error: deleteError } = await this.supabase
            .from('market_listings')
            .delete()
            .eq('id', listingId);

        if (deleteError) throw deleteError;

        const char = await this.getCharacter(userId);

        // Item volta para CLAIM
        this.addClaim(char, {
            type: 'CANCELLED_LISTING',
            itemId: listing.item_id,
            amount: listing.amount,
            name: listing.item_data.name,
            timestamp: Date.now()
        });

        await this.saveState(userId, char.state);

        return { success: true, message: "Listagem cancelada. Item enviado para aba Coletar." };
    }

    addClaim(char, claimData) {
        if (!char.state.claims) char.state.claims = [];
        char.state.claims.push({
            id: Date.now().toString() + Math.random().toString().slice(2, 8),
            ...claimData
        });
    }

    async claimMarketItem(userId, claimId) {
        const char = await this.getCharacter(userId);
        if (!char.state.claims) return { success: false, message: "Nenhum item para coletar." };

        const claimIndex = char.state.claims.findIndex(c => c.id === claimId);
        if (claimIndex === -1) return { success: false, message: "Claim não encontrado." };

        const claim = char.state.claims[claimIndex];

        // Processar Claim
        if (claim.silver) {
            char.state.silver = (char.state.silver || 0) + claim.silver;
            console.log(`[CLAIM] Adding ${claim.silver} silver to ${char.name}`);
        }
        if (claim.itemId) {
            this.addItemToInventory(char, claim.itemId, claim.amount);
            console.log(`[CLAIM] Adding ${claim.amount}x ${claim.itemId} to ${char.name}`);
        }

        // Remover Claim processado
        char.state.claims.splice(claimIndex, 1);

        await this.saveState(userId, char.state);
        return { success: true, message: "Coletado com sucesso!" };
    }
}
