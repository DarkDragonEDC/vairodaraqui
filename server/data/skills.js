export const calculateNextLevelXP = (level) => {
    return Math.floor(100 * Math.pow(1.15, level - 1));
};

export const INITIAL_SKILLS = {
    // Gathering
    LUMBERJACK: { level: 1, xp: 0 },
    ORE_MINER: { level: 1, xp: 0 },
    ANIMAL_SKINNER: { level: 1, xp: 0 },
    FIBER_HARVESTER: { level: 1, xp: 0 },

    // Refining
    PLANK_REFINER: { level: 1, xp: 0 },
    METAL_BAR_REFINER: { level: 1, xp: 0 },
    LEATHER_REFINER: { level: 1, xp: 0 },
    CLOTH_REFINER: { level: 1, xp: 0 },

    // Crafting
    WARRIOR_CRAFTER: { level: 1, xp: 0 },
    HUNTER_CRAFTER: { level: 1, xp: 0 },
    MAGE_CRAFTER: { level: 1, xp: 0 },

    // Combat
    COMBAT: { level: 1, xp: 0 },
    SWORD_MASTERY: { level: 1, xp: 0 },
    BOW_MASTERY: { level: 1, xp: 0 },
    FIRE_STAFF_MASTERY: { level: 1, xp: 0 },

    // Specialization
    FISHING: { level: 1, xp: 0 },
    COOKING: { level: 1, xp: 0 },
    DUNGEONEERING: { level: 1, xp: 0 },
};
