export const MONSTERS = {
    1: [
        { id: 'RABBIT', name: 'Rabbit', health: 30, damage: 3, xp: 10, loot: { 'T1_HIDE': 0.6 }, silver: [5, 15], tier: 1 },
        { id: 'ROCK_ELEMENTAL_T1', name: 'Small Rock Elemental', health: 60, damage: 8, xp: 15, loot: { 'T1_ORE': 0.6 }, silver: [10, 20], tier: 1 },
    ],
    2: [
        { id: 'WOLF', name: 'Wolf', health: 150, damage: 12, xp: 35, loot: { 'T2_HIDE': 0.5 }, silver: [20, 40], tier: 2 },
        { id: 'FOREST_SPIRIT', name: 'Forest Spirit', health: 220, damage: 18, xp: 40, loot: { 'T2_WOOD': 0.5 }, silver: [25, 50], tier: 2 },
    ],
    3: [
        { id: 'BEAR', name: 'Bear', health: 450, damage: 35, xp: 90, loot: { 'T3_HIDE': 0.5 }, silver: [60, 120], tier: 3 },
        { id: 'SKELETON', name: 'Skeleton', health: 600, damage: 45, xp: 110, loot: { 'T3_FIBER': 0.4 }, silver: [80, 150], tier: 3 },
    ],
    4: [
        { id: 'DIRE_WOLF', name: 'Dire Wolf', health: 1200, damage: 90, xp: 300, loot: { 'T4_HIDE': 0.4 }, silver: [200, 400], tier: 4 },
        { id: 'UNDEAD_SOLDIER', name: 'Undead Soldier', health: 1500, damage: 110, xp: 350, loot: { 'T4_BAR': 0.2 }, silver: [250, 500], tier: 4 },
    ],
    5: [
        { id: 'OGRE', name: 'Ogre', health: 3500, damage: 220, xp: 850, loot: { 'T5_HIDE': 0.4 }, silver: [600, 1200], tier: 5 },
        { id: 'LICH', name: 'Ancient Lich', health: 4200, damage: 280, xp: 1000, loot: { 'T5_CLOTH': 0.2 }, silver: [800, 1500], tier: 5 },
    ],
    6: [
        { id: 'TROLL', name: 'Mountain Troll', health: 8000, damage: 550, xp: 2200, loot: { 'T6_HIDE': 0.3, 'T5_LEATHER': 0.15 }, silver: [1500, 3000], tier: 6 },
        { id: 'FIRE_ELEMENTAL', name: 'Fire Elemental', health: 9500, damage: 650, xp: 2500, loot: { 'T6_ORE': 0.3, 'T5_BAR': 0.15 }, silver: [2000, 3500], tier: 6 },
    ],
    7: [
        { id: 'DRAGON_WHELP', name: 'Dragon Whelp', health: 18000, damage: 1200, xp: 5500, loot: { 'T7_HIDE': 0.3, 'T6_LEATHER': 0.15 }, silver: [3500, 7000], tier: 7 },
        { id: 'DARK_KNIGHT', name: 'Dark Knight', health: 22000, damage: 1400, xp: 6000, loot: { 'T7_BAR': 0.2, 'T6_BAR': 0.15 }, silver: [4000, 8000], tier: 7 },
    ],
    8: [
        { id: 'ANCIENT_GOLEM', name: 'Ancient Golem', health: 40000, damage: 2800, xp: 13000, loot: { 'T8_ORE': 0.3, 'T7_BAR': 0.2 }, silver: [8000, 16000], tier: 8 },
        { id: 'DEMON', name: 'Lesser Demon', health: 50000, damage: 3200, xp: 15000, loot: { 'T8_FIBER': 0.25, 'T7_CLOTH': 0.15 }, silver: [10000, 18000], tier: 8 },
    ],
    9: [
        { id: 'ELDER_DRAGON', name: 'Elder Dragon', health: 90000, damage: 6000, xp: 32000, loot: { 'T9_HIDE': 0.25, 'T8_LEATHER': 0.25 }, silver: [18000, 36000], tier: 9 },
        { id: 'ARCHDEMON', name: 'Archdemon', health: 110000, damage: 7500, xp: 35000, loot: { 'T9_BAR': 0.2, 'T8_BAR': 0.25 }, silver: [20000, 40000], tier: 9 },
    ],
    10: [
        { id: 'ANCIENT_DRAGON', name: 'Ancient Dragon', health: 200000, damage: 13000, xp: 75000, loot: { 'T10_HIDE': 0.2, 'T9_LEATHER': 0.3 }, silver: [40000, 80000], tier: 10 },
        { id: 'DEMON_LORD', name: 'Demon Lord', health: 240000, damage: 16000, xp: 80000, loot: { 'T10_BAR': 0.15, 'T9_BAR': 0.3 }, silver: [50000, 90000], tier: 10 },
    ],
};
