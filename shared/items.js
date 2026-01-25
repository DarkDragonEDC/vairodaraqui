export const TIERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export const RESOURCE_TYPES = {
    WOOD: 'Wood', ORE: 'Ore', HIDE: 'Hide', FIBER: 'Fiber', FISH: 'Fish'
};

export const CRAFTING_STATIONS = {
    WARRIORS_FORGE: 'Warrior\'s Forge',
    HUNTERS_LODGE: 'Hunter\'s Lodge',
    MAGES_TOWER: 'Mage\'s Tower',
    COOKING_STATION: 'Cooking Station'
};

const getBaseIP = (tier) => tier * 100;

export const QUALITIES = {
    0: { id: 0, name: 'Normal', suffix: '', chance: 0.699, ipBonus: 0, color: '#fff' },
    1: { id: 1, name: 'Good', suffix: '_Q1', chance: 0.20, ipBonus: 20, color: '#4caf50' },
    2: { id: 2, name: 'Outstanding', suffix: '_Q2', chance: 0.09, ipBonus: 50, color: '#4a90e2' },
    3: { id: 3, name: 'Excellent', suffix: '_Q3', chance: 0.01, ipBonus: 100, color: '#9013fe' },
    4: { id: 4, name: 'Masterpiece', suffix: '_Q4', chance: 0.001, ipBonus: 200, color: '#f5a623' }
};

// --- SCALING CONSTANTS ---
// Exponential Growth Factor for Tiers
const DMG_CURVE = [10, 25, 60, 150, 400, 1000, 2500, 6000, 14000, 30000]; // Weapon Dmg
const DEF_CURVE = [5, 15, 30, 80, 200, 500, 1200, 3000, 7000, 15000];   // Armor Def
const HP_CURVE = [50, 120, 240, 800, 2000, 5000, 12000, 30000, 80000, 200000]; // Armor HP

// USER PROVIDED DATA FOR XP AND TIME
const GATHER_DATA = {
    xp: [1, 2, 4, 7, 11, 16, 22, 29, 37, 46],
    time: [15, 20, 30, 40, 50, 60, 70, 80, 90, 100]
};
const REFINE_DATA = {
    xp: [2, 4, 8, 14, 22, 32, 44, 58, 74, 92],
    time: [15, 20, 30, 40, 50, 60, 70, 80, 90, 100]
};
const CRAFT_DATA = {
    xp: [40, 80, 160, 280, 440, 640, 880, 1160, 1480, 1840],
    time: [240, 320, 480, 640, 800, 960, 1120, 1280, 1440, 1520]
};

export const ITEMS = {
    RAW: {
        WOOD: {}, ORE: {}, HIDE: {}, FIBER: {}, FISH: {}
    },
    REFINED: {
        PLANK: {}, BAR: {}, LEATHER: {}, CLOTH: {}
    },
    CONSUMABLE: {
        FOOD: {}
    },
    GEAR: {
        WARRIORS_FORGE: { SWORD: {}, SHIELD: {}, PLATE_ARMOR: {}, PLATE_HELMET: {}, PLATE_BOOTS: {}, PLATE_GLOVES: {}, PLATE_CAPE: {}, PICKAXE: {} },
        HUNTERS_LODGE: { BOW: {}, TORCH: {}, LEATHER_ARMOR: {}, LEATHER_HELMET: {}, LEATHER_BOOTS: {}, LEATHER_GLOVES: {}, LEATHER_CAPE: {}, AXE: {}, SKINNING_KNIFE: {} },
        MAGES_TOWER: { FIRE_STAFF: {}, TOME: {}, CLOTH_ARMOR: {}, CLOTH_HELMET: {}, CLOTH_BOOTS: {}, CLOTH_GLOVES: {}, CAPE: {}, SICKLE: {}, FISHING_ROD: {} },
        COOKING_STATION: { FOOD: {} }
    },
    MAPS: {},
    SPECIAL: { CREST: {} }
};

// --- GENERATOR FUNCTIONS ---
const genRaw = (type, idPrefix) => {
    for (const t of TIERS) {
        ITEMS.RAW[type][t] = {
            id: `T${t}_${idPrefix}`,
            name: `${type.charAt(0) + type.slice(1).toLowerCase()}`,
            tier: t,
            type: 'RESOURCE',
            xp: GATHER_DATA.xp[t - 1],
            time: GATHER_DATA.time[t - 1]
        };
    }
};

const genRefined = (type, idPrefix, rawId) => {
    for (const t of TIERS) {
        const req = {};
        req[`T${t}_${rawId}`] = 2; // Flat cost of 2 raw materials for any tier

        ITEMS.REFINED[type][t] = {
            id: `T${t}_${idPrefix}`,
            name: type.charAt(0) + type.slice(1).toLowerCase(),
            tier: t,
            type: 'RESOURCE',
            req,
            xp: REFINE_DATA.xp[t - 1],
            time: REFINE_DATA.time[t - 1]
        };
    }
};

// Generate Materials
genRaw('WOOD', 'WOOD'); genRaw('ORE', 'ORE'); genRaw('HIDE', 'HIDE'); genRaw('FIBER', 'FIBER');
genRaw('FISH', 'FISH'); // Fish is special, but for now standard

// Override Icon for T1 Wood (Test)
if (ITEMS.RAW.WOOD[1]) ITEMS.RAW.WOOD[1].icon = '/items/T1_WOOD.png';
ITEMS.RAW.WOOD[2].icon = '/items/T2_WOOD.png';
ITEMS.RAW.WOOD[3].icon = '/items/T3_WOOD.png';
ITEMS.RAW.WOOD[4].icon = '/items/T4_WOOD.png';
ITEMS.RAW.WOOD[5].icon = '/items/T5_WOOD.png';
ITEMS.RAW.WOOD[6].icon = '/items/T6_WOOD.png';
ITEMS.RAW.WOOD[7].icon = '/items/T7_WOOD.png';
ITEMS.RAW.WOOD[8].icon = '/items/T8_WOOD.png';
ITEMS.RAW.WOOD[9].icon = '/items/T9_WOOD.png';
ITEMS.RAW.WOOD[10].icon = '/items/T10_WOOD.png';

// Override Icon for T1 Ore
if (ITEMS.RAW.ORE[1]) ITEMS.RAW.ORE[1].icon = '/items/T1_ORE.png';

// Override Icon for T1 Hide
if (ITEMS.RAW.HIDE[1]) ITEMS.RAW.HIDE[1].icon = '/items/T1_HIDE.png';

// Override Icon for T2 Hide
if (ITEMS.RAW.HIDE[2]) ITEMS.RAW.HIDE[2].icon = '/items/T2_HIDE.png';

// Override Icon for T3 Hide
if (ITEMS.RAW.HIDE[3]) ITEMS.RAW.HIDE[3].icon = '/items/T3_HIDE.png';

// Override Icon for T4 Hide
if (ITEMS.RAW.HIDE[4]) ITEMS.RAW.HIDE[4].icon = '/items/T4_HIDE.png';

// Override Icon for T5 Hide
if (ITEMS.RAW.HIDE[5]) ITEMS.RAW.HIDE[5].icon = '/items/T5_HIDE.png';

// Override Icon for T6 Hide
if (ITEMS.RAW.HIDE[6]) ITEMS.RAW.HIDE[6].icon = '/items/T6_HIDE.png';

// Override Icon for T7 Hide
if (ITEMS.RAW.HIDE[7]) ITEMS.RAW.HIDE[7].icon = '/items/T7_HIDE.png';

// Override Icon for T8 Hide
if (ITEMS.RAW.HIDE[8]) ITEMS.RAW.HIDE[8].icon = '/items/T8_HIDE.png';

// Override Icon for T9 Hide
if (ITEMS.RAW.HIDE[9]) ITEMS.RAW.HIDE[9].icon = '/items/T9_HIDE.png';

// Override Icon for T10 Hide
if (ITEMS.RAW.HIDE[10]) ITEMS.RAW.HIDE[10].icon = '/items/T10_HIDE.png';

// Override Icon for T1 Fish
if (ITEMS.RAW.FISH[1]) ITEMS.RAW.FISH[1].icon = '/items/T1_FISH.png';

// Override Icon for T2 Fish
if (ITEMS.RAW.FISH[2]) ITEMS.RAW.FISH[2].icon = '/items/T2_FISH.png';

// Override Icon for T3 Fish
if (ITEMS.RAW.FISH[3]) ITEMS.RAW.FISH[3].icon = '/items/T3_FISH.png';

// Override Icon for T4 Fish
if (ITEMS.RAW.FISH[4]) ITEMS.RAW.FISH[4].icon = '/items/T4_FISH.png';

// Override Icon for T5 Fish
if (ITEMS.RAW.FISH[5]) ITEMS.RAW.FISH[5].icon = '/items/T5_FISH.png';

// Override Icon for T6 Fish
if (ITEMS.RAW.FISH[6]) ITEMS.RAW.FISH[6].icon = '/items/T6_FISH.png';

// Override Icon for T7 Fish
if (ITEMS.RAW.FISH[7]) ITEMS.RAW.FISH[7].icon = '/items/T7_FISH.png';

// Override Icon for T8 Fish
if (ITEMS.RAW.FISH[8]) ITEMS.RAW.FISH[8].icon = '/items/T8_FISH.png';

// Override Icon for T9 Fish
if (ITEMS.RAW.FISH[9]) ITEMS.RAW.FISH[9].icon = '/items/T9_FISH.png';

// Override Icon for T10 Fish
if (ITEMS.RAW.FISH[10]) ITEMS.RAW.FISH[10].icon = '/items/T10_FISH.png';
if (ITEMS.RAW.ORE[2]) ITEMS.RAW.ORE[2].icon = '/items/T2_ORE.png';
if (ITEMS.RAW.ORE[3]) ITEMS.RAW.ORE[3].icon = '/items/T3_ORE.png';
if (ITEMS.RAW.ORE[4]) ITEMS.RAW.ORE[4].icon = '/items/T4_ORE.png';
if (ITEMS.RAW.ORE[5]) ITEMS.RAW.ORE[5].icon = '/items/T5_ORE.png';
if (ITEMS.RAW.ORE[6]) ITEMS.RAW.ORE[6].icon = '/items/T6_ORE.png';
if (ITEMS.RAW.ORE[7]) { ITEMS.RAW.ORE[7].icon = '/items/T7_ORE.png'; ITEMS.RAW.ORE[7].scale = '170%'; }
if (ITEMS.RAW.ORE[8]) ITEMS.RAW.ORE[8].icon = '/items/T8_ORE.png';
if (ITEMS.RAW.ORE[9]) ITEMS.RAW.ORE[9].icon = '/items/T9_ORE.png';
if (ITEMS.RAW.ORE[10]) ITEMS.RAW.ORE[10].icon = '/items/T10_ORE.png';

// Generate Refined
genRefined('PLANK', 'PLANK', 'WOOD');
genRefined('BAR', 'BAR', 'ORE');
genRefined('LEATHER', 'LEATHER', 'HIDE');
genRefined('CLOTH', 'CLOTH', 'FIBER');

// Generate Food
for (const t of TIERS) {
    const foodItem = {
        id: `T${t}_FOOD`, name: 'Food', tier: t, type: 'FOOD',
        heal: HP_CURVE[t - 1], // Heals roughly 1 full HP bar of that tier
        req: { [`T${t}_FISH`]: 2 },
        xp: REFINE_DATA.xp[t - 1], // Use refining curve for food
        time: REFINE_DATA.time[t - 1]
    };
    ITEMS.CONSUMABLE.FOOD[t] = foodItem;
    ITEMS.GEAR.COOKING_STATION.FOOD[t] = foodItem;
}

// Override Icons for Refined Items
if (ITEMS.REFINED.BAR[1]) { ITEMS.REFINED.BAR[1].icon = '/items/T1_BAR.png'; ITEMS.REFINED.BAR[1].scale = '200%'; }
if (ITEMS.REFINED.BAR[2]) { ITEMS.REFINED.BAR[2].icon = '/items/T2_BAR.png'; ITEMS.REFINED.BAR[2].scale = '200%'; }
if (ITEMS.REFINED.BAR[3]) { ITEMS.REFINED.BAR[3].icon = '/items/T3_BAR.png'; ITEMS.REFINED.BAR[3].scale = '200%'; }
if (ITEMS.REFINED.BAR[4]) { ITEMS.REFINED.BAR[4].icon = '/items/T4_BAR.png'; ITEMS.REFINED.BAR[4].scale = '200%'; }
if (ITEMS.REFINED.BAR[5]) { ITEMS.REFINED.BAR[5].icon = '/items/T5_BAR.png'; ITEMS.REFINED.BAR[5].scale = '200%'; }
if (ITEMS.REFINED.BAR[6]) { ITEMS.REFINED.BAR[6].icon = '/items/T6_BAR.png'; ITEMS.REFINED.BAR[6].scale = '200%'; }
if (ITEMS.REFINED.BAR[7]) { ITEMS.REFINED.BAR[7].icon = '/items/T7_BAR.png'; ITEMS.REFINED.BAR[7].scale = '200%'; }
if (ITEMS.REFINED.BAR[8]) { ITEMS.REFINED.BAR[8].icon = '/items/T8_BAR.png'; ITEMS.REFINED.BAR[8].scale = '200%'; }
if (ITEMS.REFINED.BAR[9]) { ITEMS.REFINED.BAR[9].icon = '/items/T9_BAR.png'; ITEMS.REFINED.BAR[9].scale = '200%'; }
if (ITEMS.REFINED.BAR[10]) { ITEMS.REFINED.BAR[10].icon = '/items/T10_BAR.png'; ITEMS.REFINED.BAR[10].scale = '200%'; }

// Generate Maps
for (const t of TIERS) {
    ITEMS.MAPS[t] = { id: `T${t}_DUNGEON_MAP`, name: 'Dungeon Map', tier: t, type: 'MAP' };
}

// Generate Crests
for (const t of TIERS) {
    ITEMS.SPECIAL.CREST[t] = { id: `T${t}_CREST`, name: 'Boss Crest', tier: t, type: 'CRAFTING_MATERIAL' };
}

// Helper for Gear Generation
const genGear = (category, slot, type, idSuffix, matType, statMultipliers = {}) => {
    for (const t of TIERS) {
        const matId = `T${t}_${matType}`;
        const prevId = t > 1 ? `T${t - 1}_${idSuffix}` : null;

        let req = {};
        let mainMatCount = 0;

        // Cost Scaling - FIXED to 20 for all tiers/slots as requested
        mainMatCount = 20;

        req[matId] = mainMatCount;
        // Capes need crests
        if (type === 'CAPE') req[`T${t}_CREST`] = 1;

        const stats = {};
        if (statMultipliers.dmg) stats.damage = Math.floor(DMG_CURVE[t - 1] * statMultipliers.dmg);
        if (statMultipliers.def) stats.defense = Math.floor(DEF_CURVE[t - 1] * statMultipliers.def);
        if (statMultipliers.hp) stats.hp = Math.floor(HP_CURVE[t - 1] * statMultipliers.hp);
        if (statMultipliers.speed) stats.speed = Math.floor(t * statMultipliers.speed); // 1-10 speed?
        if (statMultipliers.speed) stats.speed = Math.floor(t * statMultipliers.speed); // 1-10 speed?
        if (statMultipliers.eff) stats.efficiency = t * 1.5; // T10 = 15% Base (Maskerpiece = 45%)
        if (statMultipliers.globalEff) {
            // New Curve: T1 (~1%) to T10 (~5% Base -> 15% Max)
            // Formula: (Tier * 0.45) + 0.55
            // T10 Base: 5.05. T10 MP: 15.15%
            // T1 Base: 1.00. T1 Normal: 1.00%
            const baseVal = parseFloat(((t * 0.45) + 0.55).toFixed(2));
            stats.efficiency = { GLOBAL: baseVal };
        }
        if (statMultipliers.atkSpeed) stats.attackSpeed = statMultipliers.atkSpeed; // Fixed base speed

        const gear = {
            id: `T${t}_${idSuffix}`,
            name: idSuffix.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
            tier: t,
            req,
            xp: CRAFT_DATA.xp[t - 1],
            time: CRAFT_DATA.time[t - 1],
            ip: getBaseIP(t),
            type: type,
            stats
        };

        // Assign to ITEMS structure
        if (!ITEMS.GEAR[category][slot]) ITEMS.GEAR[category][slot] = {};
        ITEMS.GEAR[category][slot][t] = gear;
    }
};

// --- WARRIOR GEAR ---
genGear('WARRIORS_FORGE', 'SWORD', 'WEAPON', 'SWORD', 'BAR', { dmg: 1.0, atkSpeed: 1000 });
genGear('WARRIORS_FORGE', 'SHIELD', 'OFF_HAND', 'SHIELD', 'BAR', { def: 0.467, hp: 0.5 }); // Matches T2 10.5 Def / 90 HP
genGear('WARRIORS_FORGE', 'PLATE_ARMOR', 'ARMOR', 'PLATE_ARMOR', 'BAR', { hp: 1.0, def: 1.0 });
genGear('WARRIORS_FORGE', 'PLATE_HELMET', 'HELMET', 'PLATE_HELMET', 'BAR', { hp: 0.25, def: 0.25 });
genGear('WARRIORS_FORGE', 'PLATE_BOOTS', 'BOOTS', 'PLATE_BOOTS', 'BAR', { hp: 0.25, def: 0.25 });
genGear('WARRIORS_FORGE', 'PLATE_GLOVES', 'GLOVES', 'PLATE_GLOVES', 'BAR', { hp: 0.15, def: 0.15, dmg: 0.05 });
genGear('WARRIORS_FORGE', 'PLATE_CAPE', 'CAPE', 'PLATE_CAPE', 'BAR', { hp: 0.2, globalEff: 1 });
genGear('WARRIORS_FORGE', 'PICKAXE', 'TOOL_PICKAXE', 'PICKAXE', 'BAR', { eff: 1 });

// --- HUNTER GEAR ---
genGear('HUNTERS_LODGE', 'BOW', 'WEAPON', 'BOW', 'PLANK', { dmg: 0.8, atkSpeed: 700 }); // Fast but lower dmg per hit
genGear('HUNTERS_LODGE', 'TORCH', 'OFF_HAND', 'TORCH', 'PLANK', { speed: 2, hp: 0.2 }); // Speed bonus
genGear('HUNTERS_LODGE', 'LEATHER_ARMOR', 'ARMOR', 'LEATHER_ARMOR', 'LEATHER', { hp: 0.7, def: 0.7, speed: 2 });
genGear('HUNTERS_LODGE', 'LEATHER_HELMET', 'HELMET', 'LEATHER_HELMET', 'LEATHER', { hp: 0.2, def: 0.2, speed: 1 });
genGear('HUNTERS_LODGE', 'LEATHER_BOOTS', 'BOOTS', 'LEATHER_BOOTS', 'LEATHER', { hp: 0.2, def: 0.2, speed: 1 });
genGear('HUNTERS_LODGE', 'LEATHER_GLOVES', 'GLOVES', 'LEATHER_GLOVES', 'LEATHER', { hp: 0.1, def: 0.1, dmg: 0.1 });
genGear('HUNTERS_LODGE', 'LEATHER_CAPE', 'CAPE', 'LEATHER_CAPE', 'LEATHER', { hp: 0.2, globalEff: 1 });
genGear('HUNTERS_LODGE', 'AXE', 'TOOL_AXE', 'AXE', 'PLANK', { eff: 1 });
genGear('HUNTERS_LODGE', 'SKINNING_KNIFE', 'TOOL_KNIFE', 'SKINNING_KNIFE', 'LEATHER', { eff: 1 });

// --- MAGE GEAR ---
genGear('MAGES_TOWER', 'FIRE_STAFF', 'WEAPON', 'FIRE_STAFF', 'PLANK', { dmg: 1.2, atkSpeed: 1500 }); // Slow but huge dmg
genGear('MAGES_TOWER', 'TOME', 'OFF_HAND', 'TOME', 'CLOTH', { dmg: 0.3 }); // Pure Dmg bonus
genGear('MAGES_TOWER', 'CLOTH_ARMOR', 'ARMOR', 'CLOTH_ARMOR', 'CLOTH', { hp: 0.5, def: 0.4, dmg: 0.2 });
genGear('MAGES_TOWER', 'CLOTH_HELMET', 'HELMET', 'CLOTH_HELMET', 'CLOTH', { hp: 0.15, def: 0.1, dmg: 0.05 });
genGear('MAGES_TOWER', 'CLOTH_BOOTS', 'BOOTS', 'CLOTH_BOOTS', 'CLOTH', { hp: 0.15, def: 0.1, dmg: 0.05 });
genGear('MAGES_TOWER', 'CLOTH_GLOVES', 'GLOVES', 'CLOTH_GLOVES', 'CLOTH', { hp: 0.1, def: 0.1, dmg: 0.1 });
genGear('MAGES_TOWER', 'CAPE', 'CAPE', 'MAGE_CAPE', 'CLOTH', { hp: 0.2, globalEff: 1 });
genGear('MAGES_TOWER', 'SICKLE', 'TOOL_SICKLE', 'SICKLE', 'CLOTH', { eff: 1 });
genGear('MAGES_TOWER', 'FISHING_ROD', 'TOOL_ROD', 'FISHING_ROD', 'PLANK', { eff: 1 });


export const ITEM_LOOKUP = {};
const indexItems = (obj) => {
    Object.values(obj).forEach(val => {
        if (val && typeof val === 'object') {
            if (val.id && val.name) {
                ITEM_LOOKUP[val.id] = val;
            } else {
                indexItems(val);
            }
        }
    });
};
indexItems(ITEMS);

export const resolveItem = (itemId) => {
    if (!itemId) return null;

    // Normalize ID
    const rawId = String(itemId).trim();
    const upperId = rawId.toUpperCase();

    // 1. Precise Lookup
    if (ITEM_LOOKUP[upperId]) {
        return {
            ...ITEM_LOOKUP[upperId],
            quality: 0,
            qualityName: QUALITIES[0].name,
            rarityColor: QUALITIES[0].color,
            name: ITEM_LOOKUP[upperId].name // Normal items don't need prefix
        };
    }

    let qualityId = 0;
    let baseId = upperId;
    let baseItem = null;

    // 2. Quality Detection (Legacy Split Method - Safer)
    if (upperId.includes('_Q')) {
        const parts = upperId.split('_Q');
        // Handle cases where ID might have multiple _Q (unlikely but safe) by taking the last part?
        // Actually, the standard structure is ID_SUFFIX_QX.
        // If split has > 2 parts, it might be tricky.
        // Let's assume the LAST part is the quality if it's a number.
        const lastPart = parts[parts.length - 1];
        const possibleQ = parseInt(lastPart);

        if (!isNaN(possibleQ)) {
            qualityId = possibleQ;
            // The base ID is everything before the last _Q
            baseId = parts.slice(0, parts.length - 1).join('_Q');
            baseItem = ITEM_LOOKUP[baseId];
        }
    }

    // 3. Fallback/Direct Lookup if 2 failed
    if (!baseItem) {
        baseItem = ITEM_LOOKUP[baseId];
    }

    if (!baseItem) return null;

    // 4. Build return object
    const quality = QUALITIES[qualityId] || QUALITIES[0];

    // RESTRICTION: Only Equipment types can have quality bonuses.
    // Materials (WOOD, ORE, etc), Refined (PLANK, BAR, etc), and Consumables (FOOD) are always Normal.
    const equipmentTypes = ['WEAPON', 'OFF_HAND', 'ARMOR', 'HELMET', 'BOOTS', 'GLOVES', 'CAPE'];
    const canHaveQuality = equipmentTypes.includes(baseItem.type);

    // If it can't have quality but we have a quality suffix, we treat it as Normal (Id stays original)
    const effectiveQualityId = canHaveQuality ? qualityId : 0;
    const effectiveQuality = canHaveQuality ? quality : QUALITIES[0];

    const ipBonus = effectiveQuality.ipBonus || 0;
    const statMultiplier = 1 + (ipBonus / 100);

    const newStats = {};
    if (baseItem.stats) {
        for (const key in baseItem.stats) {
            if (typeof baseItem.stats[key] === 'number') {
                if (key === 'attackSpeed') newStats[key] = baseItem.stats[key];
                else newStats[key] = parseFloat((baseItem.stats[key] * statMultiplier).toFixed(1));
            } else if (key === 'efficiency' && typeof baseItem.stats[key] === 'object') {
                // Handle Efficiency Object specifically
                newStats[key] = {};
                for (const subKey in baseItem.stats[key]) {
                    newStats[key][subKey] = parseFloat((baseItem.stats[key][subKey] * statMultiplier).toFixed(1));
                }
            } else {
                newStats[key] = baseItem.stats[key];
            }
        }
    }

    // Determine Rarity Name prefix
    const qualityPrefix = (quality.name && quality.name !== 'Normal') ? `${quality.name} ` : '';

    return {
        ...baseItem,
        id: rawId,
        name: `${qualityPrefix}${baseItem.name}`,
        rarityColor: effectiveQuality.color,
        quality: effectiveQualityId,
        qualityName: effectiveQuality.name,
        originalId: baseId,
        ip: (baseItem.ip || 0) + ipBonus,
        stats: newStats
    };
};

export const formatItemId = (itemId) => itemId ? itemId.replace(/_/g, ' ') : '';
export const getTierColor = (tier) => {
    const colors = {
        1: '#9e9e9e', 2: '#ffffff', 3: '#4caf50', 4: '#42a5f5', 5: '#ab47bc',
        6: '#ff9800', 7: '#f44336', 8: '#ffd700', 9: '#00e5ff', 10: '#ff4081'
    };
    return colors[tier] || '#9e9e9e';
};
export const calculateItemSellPrice = (item, itemId) => {
    if (!item) return 0;
    const tierPrices = { 1: 5, 2: 15, 3: 40, 4: 100, 5: 250, 6: 600, 7: 1500, 8: 4000, 9: 10000, 10: 25000 };
    return tierPrices[item.tier] || 5;
};
