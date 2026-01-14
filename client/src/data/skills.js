export const calculateNextLevelXP = (level) => {
    return Math.floor(100 * Math.pow(1.15, level - 1));
};

export const INITIAL_SKILLS = {
    // Gathering
    LUMBERJACK: { level: 1, xp: 0, nextLevelXp: 100 },
    ORE_MINER: { level: 1, xp: 0, nextLevelXp: 100 },
    ANIMAL_SKINNER: { level: 1, xp: 0, nextLevelXp: 100 },
    FIBER_HARVESTER: { level: 1, xp: 0, nextLevelXp: 100 },

    // Refining
    PLANK_REFINER: { level: 1, xp: 0, nextLevelXp: 100 },
    METAL_BAR_REFINER: { level: 1, xp: 0, nextLevelXp: 100 },
    LEATHER_REFINER: { level: 1, xp: 0, nextLevelXp: 100 },
    CLOTH_REFINER: { level: 1, xp: 0, nextLevelXp: 100 },

    // Crafting
    WARRIOR_CRAFTER: { level: 1, xp: 0, nextLevelXp: 100 },
    HUNTER_CRAFTER: { level: 1, xp: 0, nextLevelXp: 100 },
    MAGE_CRAFTER: { level: 1, xp: 0, nextLevelXp: 100 },

    // Combat
    COMBAT: { level: 1, xp: 0, nextLevelXp: 100 },
    SWORD_MASTERY: { level: 1, xp: 0, nextLevelXp: 200 },
    BOW_MASTERY: { level: 1, xp: 0, nextLevelXp: 200 },
    FIRE_STAFF_MASTERY: { level: 1, xp: 0, nextLevelXp: 200 },

    // Specialization
    FISHING: { level: 1, xp: 0, nextLevelXp: 100 },
    COOKING: { level: 1, xp: 0, nextLevelXp: 100 },
    DUNGEONEERING: { level: 1, xp: 0, nextLevelXp: 100 },
};
