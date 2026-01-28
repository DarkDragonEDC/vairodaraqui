import { ITEMS, QUALITIES, resolveItem } from '../../shared/items.js';

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

export class InventoryManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
    }

    resolveItem(id) {
        return resolveItem(id);
    }

    addItemToInventory(char, itemId, amount) {
        if (!char.state.inventory) char.state.inventory = {};
        const inv = char.state.inventory;

        if (!inv[itemId]) {
            if (Object.keys(inv).length >= 50) {
                return false;
            }
        }

        const safeAmount = Number(amount) || 0;
        inv[itemId] = (Number(inv[itemId]) || 0) + safeAmount;
        if (inv[itemId] <= 0) delete inv[itemId];
        return true;
    }

    canAddItem(char, itemId) {
        if (!char.state.inventory) return true;
        const inv = char.state.inventory;
        if (!inv[itemId]) {
            if (Object.keys(inv).length >= 50) {
                return false;
            }
        }
        return true;
    }

    hasItems(char, req) {
        if (!req) return true;
        const inv = char.state.inventory;
        if (!inv) return false;
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

    async equipItem(userId, characterId, itemId) {
        const char = await this.gameManager.getCharacter(userId, characterId);
        const item = this.resolveItem(itemId);
        if (!item) throw new Error("Item not found");

        const validSlots = ['WEAPON', 'ARMOR', 'HELMET', 'BOOTS', 'GLOVES', 'CAPE', 'OFF_HAND', 'TOOL', 'TOOL_AXE', 'TOOL_PICKAXE', 'TOOL_KNIFE', 'TOOL_SICKLE', 'TOOL_ROD', 'FOOD'];
        if (!validSlots.includes(item.type)) {
            throw new Error("This item cannot be equipped");
        }

        const state = char.state;
        if (!state.inventory[itemId] || state.inventory[itemId] < 1) {
            throw new Error("You do not have this item");
        }

        let slotName = '';
        switch (item.type) {
            case 'WEAPON': slotName = 'mainHand'; break;
            case 'OFF_HAND': slotName = 'offHand'; break;
            case 'ARMOR': slotName = 'chest'; break;
            case 'HELMET': slotName = 'helmet'; break;
            case 'BOOTS': slotName = 'boots'; break;
            case 'GLOVES': slotName = 'gloves'; break;
            case 'CAPE': slotName = 'cape'; break;
            case 'TOOL': slotName = 'tool'; break;
            case 'TOOL_AXE': slotName = 'tool_axe'; break;
            case 'TOOL_PICKAXE': slotName = 'tool_pickaxe'; break;
            case 'TOOL_KNIFE': slotName = 'tool_knife'; break;
            case 'TOOL_SICKLE': slotName = 'tool_sickle'; break;
            case 'TOOL_ROD': slotName = 'tool_rod'; break;
            case 'FOOD': slotName = 'food'; break;
            default: throw new Error("Unknown slot type");
        }

        if (!state.equipment) state.equipment = {};

        if (slotName === 'food') {
            const amount = state.inventory[itemId];
            delete state.inventory[itemId];

            const currentEquip = state.equipment.food;
            if (currentEquip) {
                if (currentEquip.id === itemId) {
                    currentEquip.amount = (currentEquip.amount || 0) + amount;
                } else {
                    // Fix: Use full ID to preserve quality
                    const oldId = currentEquip.id;
                    const oldAmount = currentEquip.amount || 1;
                    state.inventory[oldId] = (state.inventory[oldId] || 0) + oldAmount;
                    state.equipment.food = { ...item, amount: amount };
                }
            } else {
                state.equipment.food = { ...item, amount: amount };
            }
        } else {
            state.inventory[itemId]--;
            if (state.inventory[itemId] <= 0) delete state.inventory[itemId];

            const currentEquip = state.equipment[slotName];
            if (currentEquip && currentEquip.id) {
                // Fix: Use full ID to preserve quality
                const oldId = currentEquip.id;
                state.inventory[oldId] = (state.inventory[oldId] || 0) + 1;
            }

            state.equipment[slotName] = item;
        }

        await this.gameManager.saveState(char.id, state);
        return { success: true, message: `${item.name} equipped!` };
    }

    async unequipItem(userId, characterId, slotName) {
        const char = await this.gameManager.getCharacter(userId, characterId);
        if (!char) throw new Error("Character not found");

        const state = char.state;
        if (!state.equipment || !state.equipment[slotName]) {
            throw new Error("Empty or invalid slot");
        }

        const item = state.equipment[slotName];
        const amount = item.amount || 1;
        // Fix: Use full ID to preserve quality
        const returnId = item.id;
        state.inventory[returnId] = (state.inventory[returnId] || 0) + amount;

        delete state.equipment[slotName];

        await this.gameManager.saveState(char.id, state);
        return { success: true, message: "Item unequipped", state };
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
        str += getLvl('COOKING');
        str += getLvl('FISHING');
        str = Math.min(100, str * 0.2);

        agi += getLvl('ANIMAL_SKINNER');
        agi += getLvl('LEATHER_REFINER');
        agi += getLvl('HUNTER_CRAFTER');
        agi += getLvl('LUMBERJACK');
        agi += getLvl('PLANK_REFINER');
        agi = Math.min(100, agi * 0.2);

        int += getLvl('FIBER_HARVESTER');
        int += getLvl('CLOTH_REFINER');
        int += getLvl('MAGE_CRAFTER');
        int += getLvl('HERBALISM');
        int += getLvl('DISTILLATION');
        int += getLvl('ALCHEMY');
        int = Math.min(100, int * (1 / 6));

        let gearHP = 0;
        let gearDamage = 0;
        let gearDefense = 0;
        let gearDmgBonus = 0;
        let gearSpeedBonus = 0;

        Object.values(equipment).forEach(item => {
            if (item) {
                // HOTFIX: Re-resolve item stats to ensure balance changes apply retroactively
                // This prevents "snapshot" stats from persisting after code updates
                const freshItem = this.resolveItem(item.id);
                const statsToUse = freshItem ? freshItem.stats : item.stats;

                if (statsToUse) {
                    if (statsToUse.hp) gearHP += statsToUse.hp;
                    if (statsToUse.damage) gearDamage += statsToUse.damage;
                    if (statsToUse.defense) gearDefense += statsToUse.defense;
                    if (statsToUse.dmgBonus) gearDmgBonus += statsToUse.dmgBonus;
                    if (statsToUse.speed && item.type !== 'WEAPON') gearSpeedBonus += statsToUse.speed;

                    // Allow gear to add directly to stats
                    if (statsToUse.str) str += statsToUse.str;
                    if (statsToUse.agi) agi += statsToUse.agi;
                    if (statsToUse.int) int += statsToUse.int;
                }
            }
        });

        const weapon = equipment.mainHand;
        const ipBonus = weapon ? (weapon.ip || 0) / 10 : 0;
        const baseAttackSpeed = weapon?.stats?.attackSpeed || 1000;

        const efficiency = {
            WOOD: 0, ORE: 0, HIDE: 0, FIBER: 0, FISH: 0, HERB: 0,
            PLANK: 0, METAL: 0, LEATHER: 0, CLOTH: 0, EXTRACT: 0,
            WARRIOR: 0, HUNTER: 0, MAGE: 0, COOKING: 0, ALCHEMY: 0, TOOLS: 0,
            GLOBAL: 0
        };

        // 1. Tool Bonuses (Re-resolve to ensure new formula applies)
        const resolveToolEff = (tool) => {
            if (!tool) return 0;
            const fresh = this.resolveItem(tool.id);
            return fresh?.stats?.efficiency || 0;
        };

        efficiency.WOOD += resolveToolEff(equipment.tool_axe);
        efficiency.ORE += resolveToolEff(equipment.tool_pickaxe);
        efficiency.HIDE += resolveToolEff(equipment.tool_knife);
        efficiency.FIBER += resolveToolEff(equipment.tool_sickle);
        efficiency.FISH += resolveToolEff(equipment.tool_rod);
        efficiency.HERB += resolveToolEff(equipment.tool_pouch);

        // 2. Global/Other Item Bonuses (e.g., Capes)
        Object.values(equipment).forEach(item => {
            if (item) {
                const freshItem = this.resolveItem(item.id);
                const statsToUse = freshItem ? freshItem.stats : item.stats;

                if (statsToUse?.efficiency && typeof statsToUse.efficiency === 'object') {
                    Object.entries(statsToUse.efficiency).forEach(([key, val]) => {
                        if (efficiency[key] !== undefined) {
                            efficiency[key] += val;
                        }
                    });
                }
            }
        });

        // 3. Skill Bonuses (Level * 0.3 per level => Max 30% at Lvl 100)
        efficiency.WOOD += getLvl('LUMBERJACK') * 0.3;
        efficiency.ORE += getLvl('ORE_MINER') * 0.3;
        efficiency.HIDE += getLvl('ANIMAL_SKINNER') * 0.3;
        efficiency.FIBER += getLvl('FIBER_HARVESTER') * 0.3;
        efficiency.FISH += getLvl('FISHING') * 0.3;
        efficiency.HERB += getLvl('HERBALISM') * 0.3;

        efficiency.PLANK += getLvl('PLANK_REFINER') * 0.3;
        efficiency.METAL += getLvl('METAL_BAR_REFINER') * 0.3;
        efficiency.LEATHER += getLvl('LEATHER_REFINER') * 0.3;
        efficiency.CLOTH += getLvl('CLOTH_REFINER') * 0.3;
        efficiency.EXTRACT += getLvl('DISTILLATION') * 0.3;

        efficiency.WARRIOR += getLvl('WARRIOR_CRAFTER') * 0.3;
        efficiency.HUNTER += getLvl('HUNTER_CRAFTER') * 0.3;
        efficiency.MAGE += getLvl('MAGE_CRAFTER') * 0.3;
        efficiency.COOKING += getLvl('COOKING') * 0.3;
        efficiency.ALCHEMY += getLvl('ALCHEMY') * 0.3;
        efficiency.TOOLS += getLvl('TOOL_CRAFTER') * 0.3;

        // 4. Intelligence Bonus to Global Yields
        // Global XP: 1% per INT
        // Silver: 1% per INT
        // Efficiency: 0% from INT (removed)

        // 4. Intelligence Bonus to Global Yields
        // Global XP: 1% per INT
        // Silver: 1% per INT
        // Efficiency: 0% from INT (removed)

        const globals = {
            xpYield: int * 0.5, // 0.5% per INT
            silverYield: int * 0.5, // 0.5% per INT
            efficiency: 0,
            globalEfficiency: 0, // Legacy/Unused
            dropRate: 0,
            qualityChance: 0
        };

        const xpBonus = {
            GLOBAL: 0,
            GATHERING: 0,
            REFINING: 0,
            CRAFTING: 0
        };

        // 5. Active Buffs Process
        if (char.state.active_buffs) {
            const now = Date.now();
            const activeCount = Object.keys(char.state.active_buffs).length;

            Object.entries(char.state.active_buffs).forEach(([type, buff]) => {
                const remaining = (buff.expiresAt - now) / 1000;
                if (buff.expiresAt > now) {
                    console.log(`[DEBUG-BUFFS] Active: ${type}, val: ${buff.value}, rem: ${remaining.toFixed(0)}s`);
                    const valPc = buff.value * 100; // 0.05 -> 5

                    switch (type) {
                        case 'GLOBAL_XP':
                            globals.xpYield += valPc;
                            break;
                        case 'GOLD':
                            globals.silverYield += valPc;
                            break;
                        case 'DROP':
                            globals.dropRate += valPc;
                            break;
                        case 'QUALITY':
                            globals.qualityChance += valPc;
                            break;
                        case 'GATHER_XP':
                            xpBonus.GATHERING += valPc;
                            break;
                        case 'REFINE_XP':
                            xpBonus.REFINING += valPc;
                            break;
                        case 'CRAFT_XP':
                            xpBonus.CRAFTING += valPc;
                            break;
                    }
                }
            });
        }

        // Apply Global to all specific categories (if we had any global efficiency sources, they would go here)
        const keys = Object.keys(efficiency).filter(k => k !== 'GLOBAL');
        keys.forEach(k => {
            efficiency[k] += efficiency.GLOBAL;
            efficiency[k] = parseFloat(efficiency[k].toFixed(2));
        });
        efficiency.GLOBAL = parseFloat(efficiency.GLOBAL.toFixed(2));

        // Total Speed = WeaponSpeed + GearSpeed
        const weaponObj = equipment.mainHand; // Renaming to avoid conflict if I really want a local handle
        const freshWeapon = weaponObj ? this.resolveItem(weaponObj.id) : null;
        const weaponSpeed = freshWeapon?.stats?.speed || 1000; // Default punch speed 1000
        const totalSpeed = weaponSpeed + gearSpeedBonus;

        const finalAttackSpeed = Math.max(200, 2000 - totalSpeed - (agi * 2));

        return {
            str, agi, int,
            maxHP: parseFloat((100 + (str * 10) + gearHP).toFixed(1)),
            damage: parseFloat(((5 + (str * 1) + (agi * 1) + (int * 1) + gearDamage) * (1 + gearDmgBonus)).toFixed(1)),
            defense: parseFloat(gearDefense.toFixed(1)),
            attackSpeed: finalAttackSpeed,
            dmgBonus: gearDmgBonus,
            efficiency,
            globals, // Return globals so we can use them in GameManager/CombatManager
            xpBonus // Return detailed XP bonuses
        };
    }
}
