export const TIERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export const RESOURCE_TYPES = {
    WOOD: 'Wood', ORE: 'Ore', HIDE: 'Hide', FIBER: 'Fiber', FISH: 'Fish'
};

export const CRAFTING_STATIONS = {
    WARRIORS_FORGE: 'Warrior\'s Forge',
    HUNTERS_LODGE: 'Hunter\'s Lodge',
    MAGES_TOWER: 'Mage\'s Tower',
    TOOLMAKER: 'Toolmaker',
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
        WOOD: {}, ORE: {}, HIDE: {}, FIBER: {}, FISH: {}, HERB: {}
    },
    REFINED: {
        PLANK: {}, BAR: {}, LEATHER: {}, CLOTH: {}, EXTRACT: {}
    },
    CONSUMABLE: {
        FOOD: {}
    },
    GEAR: {
        WARRIORS_FORGE: { SWORD: {}, SHIELD: {}, PLATE_ARMOR: {}, PLATE_HELMET: {}, PLATE_BOOTS: {}, PLATE_GLOVES: {}, PLATE_CAPE: {}, PICKAXE: {} },
        HUNTERS_LODGE: { BOW: {}, TORCH: {}, LEATHER_ARMOR: {}, LEATHER_HELMET: {}, LEATHER_BOOTS: {}, LEATHER_GLOVES: {}, LEATHER_CAPE: {}, AXE: {}, SKINNING_KNIFE: {} },
        MAGES_TOWER: { FIRE_STAFF: {}, TOME: {}, CLOTH_ARMOR: {}, CLOTH_HELMET: {}, CLOTH_BOOTS: {}, CLOTH_GLOVES: {}, CAPE: {} },
        TOOLMAKER: { PICKAXE: {}, AXE: {}, SKINNING_KNIFE: {}, SICKLE: {}, FISHING_ROD: {} },
        COOKING_STATION: { FOOD: {} },
        ALCHEMY_LAB: { POTION: {} }
    },
    MAPS: {},
    SPECIAL: { CREST: {}, CHEST: {} }
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
genRaw('HERB', 'HERB');

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

// Override Icons for Fiber
if (ITEMS.RAW.FIBER[1]) ITEMS.RAW.FIBER[1].icon = '/items/T1_FIBER.png';
if (ITEMS.RAW.FIBER[2]) ITEMS.RAW.FIBER[2].icon = '/items/T2_FIBER.png';
if (ITEMS.RAW.FIBER[3]) ITEMS.RAW.FIBER[3].icon = '/items/T3_FIBER.png';
if (ITEMS.RAW.FIBER[4]) ITEMS.RAW.FIBER[4].icon = '/items/T4_FIBER.png';
if (ITEMS.RAW.FIBER[5]) ITEMS.RAW.FIBER[5].icon = '/items/T5_FIBER.png';
if (ITEMS.RAW.FIBER[6]) ITEMS.RAW.FIBER[6].icon = '/items/T6_FIBER.png';
if (ITEMS.RAW.FIBER[7]) ITEMS.RAW.FIBER[7].icon = '/items/T7_FIBER.png';
if (ITEMS.RAW.FIBER[8]) ITEMS.RAW.FIBER[8].icon = '/items/T8_FIBER.png';
if (ITEMS.RAW.FIBER[9]) ITEMS.RAW.FIBER[9].icon = '/items/T9_FIBER.png';
if (ITEMS.RAW.FIBER[10]) ITEMS.RAW.FIBER[10].icon = '/items/T10_FIBER.png';

// Generate Refined
genRefined('PLANK', 'PLANK', 'WOOD');
genRefined('BAR', 'BAR', 'ORE');
genRefined('LEATHER', 'LEATHER', 'HIDE');
genRefined('CLOTH', 'CLOTH', 'FIBER');
genRefined('EXTRACT', 'EXTRACT', 'HERB');

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

// --- POTION GENERATOR ---
const POTION_TYPES = {
    GATHER_XP: { name: 'Gathering Potion', suffix: '_POTION_GATHER', desc: 'Increases Gathering XP', scale: 0.03, base: 0.02 }, // T1: 5%, T10: 32% (Approx) -> Formula TBD
    REFINE_XP: { name: 'Refining Potion', suffix: '_POTION_REFINE', desc: 'Increases Refining XP', scale: 0.03, base: 0.02 },
    CRAFT_XP: { name: 'Crafting Potion', suffix: '_POTION_CRAFT', desc: 'Increases Crafting XP', scale: 0.03, base: 0.02 },
    GOLD: { name: 'Silver Potion', suffix: '_POTION_GOLD', desc: 'Increases Silver gain', scale: 0.02, base: 0.00 }, // T1: 2%, T10: 20%
    QUALITY: { name: 'Quality Potion', suffix: '_POTION_QUALITY', desc: 'Increases Craft Quality Chance', scale: 0.005, base: 0.005 }, // T1: 1%, T10: 5.5%
    DROP: { name: 'Luck Potion', suffix: '_POTION_LUCK', desc: 'Increases Drop Rate', scale: 0.02, base: 0.00 },
    GLOBAL_XP: { name: 'Knowledge Potion', suffix: '_POTION_XP', desc: 'Increases Global XP', scale: 0.02, base: 0.00 }
};

// Override scaling to match User Request exactly
const POTION_SCALING = {
    // Specific XP (5% -> 35%)
    XP_SPECIFIC: [5, 7, 10, 12, 15, 18, 22, 26, 30, 35],
    // Global/Gold/Drop (2% -> 20%)
    GLOBAL: [2, 3, 4, 5, 6, 8, 10, 12, 15, 20],
    // Quality (4% -> 40%)
    QUALITY: [4, 8, 12, 16, 20, 24, 28, 32, 36, 40]
};

const genPotions = () => {
    for (const [key, data] of Object.entries(POTION_TYPES)) {
        ITEMS.CONSUMABLE[key] = {}; // Init category in CONSUMABLE if needed (or just flat list?)
        // Let's use specific keys in CONSUMABLE to easier lookup if needed, or just flatten.
        // ActivityManager checks generic items.

        // We'll put them in ITEMS.GEAR.ALCHEMY_LAB with specific keys so the UI groups them?
        // Actually UI groups by ITEM ID usually or Category.
        // Let's put them all in ALCHEMY_LAB.POTION but maybe distinct sub-tabs if we want?
        // App.jsx logic: `const itemsToRender = Object.values(activeCategoryData || {})`
        // So if we put them all in `ITEMS.GEAR.ALCHEMY_LAB.POTION`, they show up in Alchemy Lab. Perfect.

        if (!ITEMS.GEAR.ALCHEMY_LAB[key]) ITEMS.GEAR.ALCHEMY_LAB[key] = {};

        for (const t of TIERS) {
            let val = 0;
            if (key.includes('XP') && key !== 'GLOBAL_XP') val = POTION_SCALING.XP_SPECIFIC[t - 1] / 100;
            else if (key === 'QUALITY') val = POTION_SCALING.QUALITY[t - 1] / 100;
            else val = POTION_SCALING.GLOBAL[t - 1] / 100;

            const id = `T${t}${data.suffix}`;

            const potionItem = {
                id: id,
                name: `${data.name}`, // T1 Gathering Potion handled by Tier badge? Or name? "Gathering Potion"
                tier: t,
                type: 'POTION',
                effect: key,
                value: val,
                desc: `${data.desc} by ${Math.round(val * 100)}%`,
                duration: 3600, // 1 Hour Duration
                req: {
                    [`T${t}_EXTRACT`]: 2
                },
                xp: CRAFT_DATA.xp[t - 1], // Craft XP
                time: CRAFT_DATA.time[t - 1] // Original Craft Time
            };

            // Register in Consumable (for lookup) and Station (for crafting)
            if (!ITEMS.CONSUMABLE[key]) ITEMS.CONSUMABLE[key] = {};
            ITEMS.CONSUMABLE[key][t] = potionItem;

            ITEMS.GEAR.ALCHEMY_LAB[key][t] = potionItem;
        }
    }
    // console.log(`[DEBUG-ITEMS] Generated ${Object.keys(POTION_TYPES).length} potion types across ${TIERS.length} tiers.`);
};
genPotions();

// Override Icon for T1 Food
if (ITEMS.CONSUMABLE.FOOD[1]) { ITEMS.CONSUMABLE.FOOD[1].icon = '/items/T1_FOOD.png'; ITEMS.CONSUMABLE.FOOD[1].scale = '200%'; }
// Override Icon for T2 Food
if (ITEMS.CONSUMABLE.FOOD[2]) { ITEMS.CONSUMABLE.FOOD[2].icon = '/items/T2_FOOD.png'; ITEMS.CONSUMABLE.FOOD[2].scale = '200%'; }
// Override Icon for T3 Food
if (ITEMS.CONSUMABLE.FOOD[3]) { ITEMS.CONSUMABLE.FOOD[3].icon = '/items/T3_FOOD_v2.png'; ITEMS.CONSUMABLE.FOOD[3].scale = '200%'; }
// Override Icon for T4 Food
if (ITEMS.CONSUMABLE.FOOD[4]) { ITEMS.CONSUMABLE.FOOD[4].icon = '/items/T4_FOOD_v2.png'; ITEMS.CONSUMABLE.FOOD[4].scale = '200%'; }
// Override Icon for T5 Food
if (ITEMS.CONSUMABLE.FOOD[5]) { ITEMS.CONSUMABLE.FOOD[5].icon = '/items/T5_FOOD.png'; ITEMS.CONSUMABLE.FOOD[5].scale = '200%'; }
// Override Icon for T6 Food
if (ITEMS.CONSUMABLE.FOOD[6]) { ITEMS.CONSUMABLE.FOOD[6].icon = '/items/T6_FOOD.png'; ITEMS.CONSUMABLE.FOOD[6].scale = '200%'; }
// Override Icon for T7 Food
if (ITEMS.CONSUMABLE.FOOD[7]) { ITEMS.CONSUMABLE.FOOD[7].icon = '/items/T7_FOOD.png'; ITEMS.CONSUMABLE.FOOD[7].scale = '200%'; }
// Override Icon for T8 Food
if (ITEMS.CONSUMABLE.FOOD[8]) { ITEMS.CONSUMABLE.FOOD[8].icon = '/items/T8_FOOD.png'; ITEMS.CONSUMABLE.FOOD[8].scale = '200%'; }
// Override Icon for T9 Food
if (ITEMS.CONSUMABLE.FOOD[9]) { ITEMS.CONSUMABLE.FOOD[9].icon = '/items/T9_FOOD.png'; ITEMS.CONSUMABLE.FOOD[9].scale = '200%'; }
// Override Icon for T10 Food
if (ITEMS.CONSUMABLE.FOOD[10]) { ITEMS.CONSUMABLE.FOOD[10].icon = '/items/T10_FOOD.png'; ITEMS.CONSUMABLE.FOOD[10].scale = '90%'; }

// Override Icons for Refined Items
if (ITEMS.REFINED.PLANK[1]) { ITEMS.REFINED.PLANK[1].icon = '/items/T1_PLANK.png'; }
if (ITEMS.REFINED.PLANK[2]) { ITEMS.REFINED.PLANK[2].icon = '/items/T2_PLANK.png'; }
if (ITEMS.REFINED.PLANK[3]) { ITEMS.REFINED.PLANK[3].icon = '/items/T3_PLANK.png'; }
if (ITEMS.REFINED.PLANK[4]) { ITEMS.REFINED.PLANK[4].icon = '/items/T4_PLANK.png'; }
if (ITEMS.REFINED.PLANK[5]) { ITEMS.REFINED.PLANK[5].icon = '/items/T5_PLANK.png'; }
if (ITEMS.REFINED.PLANK[6]) { ITEMS.REFINED.PLANK[6].icon = '/items/T6_PLANK.png'; }
if (ITEMS.REFINED.PLANK[7]) { ITEMS.REFINED.PLANK[7].icon = '/items/T7_PLANK.png'; }
if (ITEMS.REFINED.PLANK[8]) { ITEMS.REFINED.PLANK[8].icon = '/items/T8_PLANK.png'; }
if (ITEMS.REFINED.PLANK[9]) { ITEMS.REFINED.PLANK[9].icon = '/items/T9_PLANK.png'; }
if (ITEMS.REFINED.PLANK[10]) { ITEMS.REFINED.PLANK[10].icon = '/items/T10_PLANK.png'; }
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

// Override Icons for Leather
if (ITEMS.REFINED.LEATHER[1]) ITEMS.REFINED.LEATHER[1].icon = '/items/T1_LEATHER.png';
if (ITEMS.REFINED.LEATHER[2]) ITEMS.REFINED.LEATHER[2].icon = '/items/T2_LEATHER.png';
if (ITEMS.REFINED.LEATHER[3]) ITEMS.REFINED.LEATHER[3].icon = '/items/T3_LEATHER.png';
if (ITEMS.REFINED.LEATHER[4]) ITEMS.REFINED.LEATHER[4].icon = '/items/T4_LEATHER.png';
if (ITEMS.REFINED.LEATHER[5]) ITEMS.REFINED.LEATHER[5].icon = '/items/T5_LEATHER.png';
if (ITEMS.REFINED.LEATHER[6]) ITEMS.REFINED.LEATHER[6].icon = '/items/T6_LEATHER.png';
if (ITEMS.REFINED.LEATHER[7]) ITEMS.REFINED.LEATHER[7].icon = '/items/T7_LEATHER.png';
if (ITEMS.REFINED.LEATHER[8]) ITEMS.REFINED.LEATHER[8].icon = '/items/T8_LEATHER.png';
if (ITEMS.REFINED.LEATHER[9]) ITEMS.REFINED.LEATHER[9].icon = '/items/T9_LEATHER.png';
if (ITEMS.REFINED.LEATHER[10]) ITEMS.REFINED.LEATHER[10].icon = '/items/T10_LEATHER.png';

// Override Icons for Cloth
if (ITEMS.REFINED.CLOTH[1]) ITEMS.REFINED.CLOTH[1].icon = '/items/T1_CLOTH.png';
if (ITEMS.REFINED.CLOTH[2]) ITEMS.REFINED.CLOTH[2].icon = '/items/T2_CLOTH.png';
if (ITEMS.REFINED.CLOTH[3]) ITEMS.REFINED.CLOTH[3].icon = '/items/T3_CLOTH.png';
if (ITEMS.REFINED.CLOTH[4]) ITEMS.REFINED.CLOTH[4].icon = '/items/T4_CLOTH.png';
if (ITEMS.REFINED.CLOTH[5]) ITEMS.REFINED.CLOTH[5].icon = '/items/T5_CLOTH.png';
if (ITEMS.REFINED.CLOTH[6]) ITEMS.REFINED.CLOTH[6].icon = '/items/T6_CLOTH.png';
if (ITEMS.REFINED.CLOTH[7]) ITEMS.REFINED.CLOTH[7].icon = '/items/T7_CLOTH.png';
if (ITEMS.REFINED.CLOTH[8]) ITEMS.REFINED.CLOTH[8].icon = '/items/T8_CLOTH.png';
if (ITEMS.REFINED.CLOTH[9]) ITEMS.REFINED.CLOTH[9].icon = '/items/T9_CLOTH.png';
// Override Icons for Clause
if (ITEMS.REFINED.CLOTH[10]) ITEMS.REFINED.CLOTH[10].icon = '/items/T10_CLOTH.png';

// Generate Maps
for (const t of TIERS) {
    ITEMS.MAPS[t] = { id: `T${t}_DUNGEON_MAP`, name: 'Dungeon Map', tier: t, type: 'MAP' };
}

// Override Icons for Potions (Reuse generic for now)
for (const [key, data] of Object.entries(POTION_TYPES)) {
    if (ITEMS.CONSUMABLE[key]) {
        for (const t of TIERS) {
            if (ITEMS.CONSUMABLE[key][t]) {
                // Use generic potion icon or specific if available. 
                // T1_POTION_XP.png, T1_POTION_GOLD.png etc would be ideal.
                // For now, let's try to map to T{t}_POTION.png as a generic base, or specific if user provided.
                // Given user said "remove broken icons", we'll leave them blank/default OR use a known working one?
                // User said "remove broken image, leave like others without icons".
                // So we DO NOT add overrides here. Logic stays clean.
            }
        }
    }
}

// Generate Crests
for (const t of TIERS) {
    ITEMS.SPECIAL.CREST[t] = { id: `T${t}_CREST`, name: 'Boss Crest', tier: t, type: 'CRAFTING_MATERIAL' };
}

// Generate Dungeon Chests
for (const t of TIERS) {
    // Normal (White)
    ITEMS.SPECIAL.CHEST[`${t}_NORMAL`] = {
        id: `T${t}_CHEST_NORMAL`,
        name: `Dungeon Chest (Normal)`,
        tier: t,
        rarity: 'COMMON',
        type: 'CONSUMABLE',
        rarityColor: '#ffffff',
        desc: 'Contains standard dungeon loot.'
    };
    // Good (Green)
    ITEMS.SPECIAL.CHEST[`${t}_GOOD`] = {
        id: `T${t}_CHEST_GOOD`,
        name: `Dungeon Chest (Good)`,
        tier: t,
        rarity: 'UNCOMMON',
        type: 'CONSUMABLE',
        rarityColor: '#4caf50',
        desc: 'A good chest with decent rewards.'
    };
    // Outstanding (Blue)
    ITEMS.SPECIAL.CHEST[`${t}_OUTSTANDING`] = {
        id: `T${t}_CHEST_OUTSTANDING`,
        name: `Dungeon Chest (Outstanding)`,
        tier: t,
        rarity: 'RARE',
        type: 'CONSUMABLE',
        rarityColor: '#4a90e2',
        desc: 'An outstanding chest with high value rewards.'
    };
    // Excellent (Purple)
    ITEMS.SPECIAL.CHEST[`${t}_EXCELLENT`] = {
        id: `T${t}_CHEST_EXCELLENT`,
        name: `Dungeon Chest (Excellent)`,
        tier: t,
        rarity: 'EPIC',
        type: 'CONSUMABLE',
        rarityColor: '#9013fe',
        desc: 'An excellent reward for great feats.'
    };
    // Masterpiece (Orange)
    ITEMS.SPECIAL.CHEST[`${t}_MASTERPIECE`] = {
        id: `T${t}_CHEST_MASTERPIECE`,
        name: `Dungeon Chest (Masterpiece)`,
        tier: t,
        rarity: 'LEGENDARY',
        type: 'CONSUMABLE',
        rarityColor: '#f5a623', // Orange/Gold
        desc: 'The highest quality chest with the best rewards.'
    };
    // Generic/Legacy Fallback
    ITEMS.SPECIAL.CHEST[`${t}_GENERIC`] = {
        id: `T${t}_DUNGEON_CHEST`,
        name: `Dungeon Chest (Legacy)`,
        tier: t,
        rarity: 'COMMON',
        type: 'CONSUMABLE',
        desc: 'A standard dungeon chest.'
    };

    // --- LEGACY ALIASES (Fix for crash) ---
    // We copy the object and override ID so resolveItem() indexes it correctly.
    ITEMS.SPECIAL.CHEST[`${t}_COMMON`] = { ...ITEMS.SPECIAL.CHEST[`${t}_NORMAL`], id: `T${t}_CHEST_COMMON`, name: `Dungeon Chest (Normal)` };
    ITEMS.SPECIAL.CHEST[`${t}_RARE`] = { ...ITEMS.SPECIAL.CHEST[`${t}_OUTSTANDING`], id: `T${t}_CHEST_RARE`, name: `Dungeon Chest (Outstanding)` };
    ITEMS.SPECIAL.CHEST[`${t}_GOLD`] = { ...ITEMS.SPECIAL.CHEST[`${t}_EXCELLENT`], id: `T${t}_CHEST_GOLD`, name: `Dungeon Chest (Excellent)` };
    ITEMS.SPECIAL.CHEST[`${t}_MYTHIC`] = { ...ITEMS.SPECIAL.CHEST[`${t}_MASTERPIECE`], id: `T${t}_CHEST_MYTHIC`, name: `Dungeon Chest (Masterpiece)` };

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
        if (statMultipliers.speed) {
            if (type === 'WEAPON') {
                stats.speed = statMultipliers.speed; // Fixed base for weapons
            } else {
                stats.speed = Math.floor(t * statMultipliers.speed); // Multiplier for gear
            }
        }
        if (statMultipliers.eff) stats.efficiency = 1; // Base value, logic moved to resolveItem
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
            isTool: !!statMultipliers.eff,
            stats
        };

        // Assign to ITEMS structure
        if (!ITEMS.GEAR[category][slot]) ITEMS.GEAR[category][slot] = {};
        ITEMS.GEAR[category][slot][t] = gear;
    }
};

// --- WARRIOR GEAR ---
genGear('WARRIORS_FORGE', 'SWORD', 'WEAPON', 'SWORD', 'BAR', { dmg: 1.0, speed: 1000 });
genGear('WARRIORS_FORGE', 'SHIELD', 'OFF_HAND', 'SHIELD', 'BAR', { def: 0.467, hp: 0.5 }); // Matches T2 10.5 Def / 90 HP
genGear('WARRIORS_FORGE', 'PLATE_ARMOR', 'ARMOR', 'PLATE_ARMOR', 'BAR', { hp: 1.0, def: 1.0 });
genGear('WARRIORS_FORGE', 'PLATE_HELMET', 'HELMET', 'PLATE_HELMET', 'BAR', { hp: 0.25, def: 0.25 });
genGear('WARRIORS_FORGE', 'PLATE_BOOTS', 'BOOTS', 'PLATE_BOOTS', 'BAR', { hp: 0.25, def: 0.25 });
genGear('WARRIORS_FORGE', 'PLATE_GLOVES', 'GLOVES', 'PLATE_GLOVES', 'BAR', { hp: 0.15, def: 0.15, dmg: 0.05 });
genGear('WARRIORS_FORGE', 'PLATE_CAPE', 'CAPE', 'PLATE_CAPE', 'BAR', { hp: 0.2, globalEff: 1 });

// --- HUNTER GEAR ---
genGear('HUNTERS_LODGE', 'BOW', 'WEAPON', 'BOW', 'PLANK', { dmg: 0.8, speed: 1253 }); // Fast but lower dmg per hit
genGear('HUNTERS_LODGE', 'TORCH', 'OFF_HAND', 'TORCH', 'PLANK', { speed: 5, hp: 0.2 }); // Speed bonus
genGear('HUNTERS_LODGE', 'LEATHER_ARMOR', 'ARMOR', 'LEATHER_ARMOR', 'LEATHER', { hp: 0.7, def: 0.7, speed: 5 });
genGear('HUNTERS_LODGE', 'LEATHER_HELMET', 'HELMET', 'LEATHER_HELMET', 'LEATHER', { hp: 0.2, def: 0.2, speed: 5 });
genGear('HUNTERS_LODGE', 'LEATHER_BOOTS', 'BOOTS', 'LEATHER_BOOTS', 'LEATHER', { hp: 0.2, def: 0.2, speed: 5 });
genGear('HUNTERS_LODGE', 'LEATHER_GLOVES', 'GLOVES', 'LEATHER_GLOVES', 'LEATHER', { hp: 0.1, def: 0.1, dmg: 0.1 });
genGear('HUNTERS_LODGE', 'LEATHER_CAPE', 'CAPE', 'LEATHER_CAPE', 'LEATHER', { hp: 0.2, globalEff: 1 });
genGear('HUNTERS_LODGE', 'LEATHER_CAPE', 'CAPE', 'LEATHER_CAPE', 'LEATHER', { hp: 0.2, globalEff: 1 });

// --- MAGE GEAR ---
genGear('MAGES_TOWER', 'FIRE_STAFF', 'WEAPON', 'FIRE_STAFF', 'PLANK', { dmg: 1.2, speed: 500 }); // Slow but huge dmg
genGear('MAGES_TOWER', 'TOME', 'OFF_HAND', 'TOME', 'CLOTH', { dmg: 0.3 }); // Pure Dmg bonus
genGear('MAGES_TOWER', 'CLOTH_ARMOR', 'ARMOR', 'CLOTH_ARMOR', 'CLOTH', { hp: 0.5, def: 0.4, dmg: 0.2 });
genGear('MAGES_TOWER', 'CLOTH_HELMET', 'HELMET', 'CLOTH_HELMET', 'CLOTH', { hp: 0.15, def: 0.1, dmg: 0.05 });
genGear('MAGES_TOWER', 'CLOTH_BOOTS', 'BOOTS', 'CLOTH_BOOTS', 'CLOTH', { hp: 0.15, def: 0.1, dmg: 0.05 });
genGear('MAGES_TOWER', 'CLOTH_GLOVES', 'GLOVES', 'CLOTH_GLOVES', 'CLOTH', { hp: 0.1, def: 0.1, dmg: 0.1 });
genGear('MAGES_TOWER', 'CAPE', 'CAPE', 'MAGE_CAPE', 'CLOTH', { hp: 0.2, globalEff: 1 });

// --- TOOLMAKER ---
genGear('TOOLMAKER', 'PICKAXE', 'TOOL_PICKAXE', 'PICKAXE', 'BAR', { eff: 1 });
genGear('TOOLMAKER', 'AXE', 'TOOL_AXE', 'AXE', 'PLANK', { eff: 1 });
genGear('TOOLMAKER', 'SKINNING_KNIFE', 'TOOL_KNIFE', 'SKINNING_KNIFE', 'LEATHER', { eff: 1 });
genGear('TOOLMAKER', 'SICKLE', 'TOOL_SICKLE', 'SICKLE', 'CLOTH', { eff: 1 });
genGear('TOOLMAKER', 'FISHING_ROD', 'TOOL_ROD', 'FISHING_ROD', 'PLANK', { eff: 1 });
genGear('TOOLMAKER', 'POUCH', 'TOOL_POUCH', 'POUCH', 'LEATHER', { eff: 1 });


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

export const resolveItem = (itemId, overrideQuality = null) => {
    if (!itemId) return null;

    // Normalize ID
    const rawId = String(itemId).trim();
    const upperId = rawId.toUpperCase();

    // 1. Precise Lookup

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

    if (overrideQuality !== null) {
        qualityId = overrideQuality;
    }

    if (!baseItem) return null;

    // 4. Build return object
    const quality = QUALITIES[qualityId] || QUALITIES[0];

    // RESTRICTION: Only Equipment types can have quality bonuses.
    // Materials (WOOD, ORE, etc), Refined (PLANK, BAR, etc), and Consumables (FOOD) are always Normal.
    const equipmentTypes = [
        'WEAPON', 'OFF_HAND', 'ARMOR', 'HELMET', 'BOOTS', 'GLOVES', 'CAPE',
        'TOOL', 'TOOL_AXE', 'TOOL_PICKAXE', 'TOOL_KNIFE', 'TOOL_SICKLE', 'TOOL_ROD', 'TOOL_POUCH'
    ];
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
                if (key === 'efficiency' && baseItem.isTool) {
                    const index = (baseItem.tier - 1) * 5 + effectiveQualityId;
                    // Formula: 1.0 + (Index * (44 / 49))
                    newStats[key] = parseFloat((1.0 + (index * (44 / 49))).toFixed(1));
                } else if (key === 'speed') {
                    // Universal Speed Calculation
                    // For Weapons: Base (e.g. 1300) + Bonus. High = Fast.
                    // For Gear: Base (e.g. 5) + Bonus. High = Fast.

                    if (baseItem.type === 'WEAPON') {
                        // Weapon Bonus: ((Tier - 1) * 15) + (QualityId * 3)
                        // Added to base Speed.
                        const bonus = ((baseItem.tier - 1) * 15) + (effectiveQualityId * 3);
                        newStats[key] = baseItem.stats[key] + bonus;
                    } else {
                        // Gear Bonus: ((Tier - 1) * 5) + 1 + QualityId
                        const speedVal = ((baseItem.tier - 1) * 5) + 1 + effectiveQualityId;
                        newStats[key] = speedVal;
                    }
                } else {
                    newStats[key] = parseFloat((baseItem.stats[key] * statMultiplier).toFixed(1));
                }
            } else if (key === 'efficiency' && typeof baseItem.stats[key] === 'object') {
                // Handle Efficiency Object specifically
                newStats[key] = {};
                for (const subKey in baseItem.stats[key]) {
                    if (subKey === 'GLOBAL') {
                        // 50-step linear progression: 10 Tiers * 5 Qualities
                        // Index: 0 (T1 Normal) to 49 (T10 Masterpiece)
                        const index = (baseItem.tier - 1) * 5 + effectiveQualityId;
                        // Formula: 1.0 + (Index * (14 / 49))
                        // Explicitly rounding to 1 decimal place to ensure 15.0
                        const calculated = 1.0 + (index * (14 / 49));
                        newStats[key][subKey] = Math.round(calculated * 10) / 10;
                    } else {
                        newStats[key][subKey] = parseFloat((baseItem.stats[key][subKey] * statMultiplier).toFixed(1));
                    }
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
        rarityColor: baseItem.rarityColor || effectiveQuality.color,
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

/**
 * Centralized mapping of item ID + Action Type to Skill Key.
 * Shared between Client and Server to ensure consistency.
 */
export const getSkillForItem = (itemId, actionType) => {
    if (!itemId) return null;
    const id = String(itemId).toUpperCase();
    const type = String(actionType).toUpperCase();

    if (type === 'GATHERING') {
        if (id.includes('WOOD')) return 'LUMBERJACK';
        if (id.includes('ORE')) return 'ORE_MINER';
        if (id.includes('HIDE')) return 'ANIMAL_SKINNER';
        if (id.includes('FIBER')) return 'FIBER_HARVESTER';
        if (id.includes('FISH')) return 'FISHING';
        if (id.includes('HERB')) return 'HERBALISM';
    }

    if (type === 'REFINING') {
        if (id.includes('PLANK')) return 'PLANK_REFINER';
        if (id.includes('BAR')) return 'METAL_BAR_REFINER';
        if (id.includes('LEATHER')) return 'LEATHER_REFINER';
        if (id.includes('CLOTH')) return 'CLOTH_REFINER';
        if (id.includes('EXTRACT')) return 'DISTILLATION';
    }

    if (type === 'CRAFTING') {
        // Tools & Pouches
        if (id.includes('PICKAXE') || id.includes('AXE') || id.includes('KNIFE') || id.includes('SICKLE') || id.includes('ROD') || id.includes('POUCH')) {
            return 'TOOL_CRAFTER';
        }
        // Warrior
        // Warrior - Includes PLATE (Armor, Boots, Helm, Gloves), SWORD, SHIELD, CAPE
        if (id.includes('SWORD') || id.includes('PLATE') || id.includes('SHIELD') || id.includes('WARRIOR_CAPE')) {
            return 'WARRIOR_CRAFTER';
        }
        // Hunter - Includes LEATHER (Armor, Boots, Helm, Gloves), BOW, TORCH
        if (id.includes('BOW') || id.includes('LEATHER') || id.includes('TORCH') || id.includes('HUNTER_CAPE')) {
            return 'HUNTER_CRAFTER';
        }
        // Mage - Includes CLOTH (Armor, Boots, Helm, Gloves), STAFF, TOME
        if (id.includes('STAFF') || id.includes('CLOTH') || id.includes('TOME') || id.includes('MAGE_CAPE')) {
            return 'MAGE_CRAFTER';
        }
        // General Capes fallback
        if (id.includes('CAPE')) return 'WARRIOR_CRAFTER';
        // Consumables
        if (id.includes('FOOD')) return 'COOKING';
        if (id.includes('POTION')) return 'ALCHEMY';
    }

    if (type === 'COOKING') return 'COOKING';

    return null;
};

/**
 * Returns the required skill level for a given tier.
 */
export const getLevelRequirement = (tier) => {
    const t = parseInt(tier) || 1;
    if (t <= 1) return 1;
    return (t - 1) * 10;
};
