
import { INITIAL_SKILLS } from '../shared/skills.js';
import { InventoryManager } from './managers/InventoryManager.js';
import { resolveItem } from '../shared/items.js'; // Ensure we can resolve items

// Mock GameManager
const mockGameManager = {
    getCharacter: async () => ({ state: {} }),
    saveState: async () => { },
    gameManager: null
};

// Mock Character
const char = {
    state: {
        skills: {},
        inventory: {},
        equipment: {}
    }
};

// 1. Max Skills
Object.keys(INITIAL_SKILLS).forEach(key => {
    char.state.skills[key] = { level: 100, xp: 20000000, nextLevelXp: 999999999 };
});

// 2. Max Equipment (Hunter Set T10 Q4)
// Need to simulate resolved items.
// We can use resolveItem from shared/items.js if we can import it.
// InventoryManager has resolveItem wrapper.

const im = new InventoryManager(mockGameManager);

const equip = (slot, id) => {
    const item = resolveItem(id);
    if (item) {
        char.state.equipment[slot] = item;
    } else {
        console.log("Failed to resolve", id);
    }
};

// Equip T10 Masterpiece Hunter Gear
equip('mainHand', 'T10_BOW_Q4');
equip('offHand', 'T10_TORCH_Q4');
equip('helmet', 'T10_LEATHER_HELMET_Q4');
equip('chest', 'T10_LEATHER_ARMOR_Q4');
equip('boots', 'T10_LEATHER_BOOTS_Q4');
equip('gloves', 'T10_LEATHER_GLOVES_Q4');
equip('cape', 'T10_LEATHER_CAPE_Q4');

// 3. Calculate Stats
const stats = im.calculateStats(char);

// 4. Output the JSON structure for the user
const output = {
    stats: {
        agi: stats.agi,
        int: stats.int,
        str: stats.str,
        totalKills: 999999
    },
    health: stats.maxHP, // Set current health to max
    maxHealth: stats.maxHP,
    silver: 999999999,
    skills: char.state.skills,
    equipment: char.state.equipment,
    inventory: {} // Filled below
};


// Add some goodies to inventory
output.inventory['T10_WOOD'] = 999;
output.inventory['T10_ORE'] = 999;
output.inventory['T10_HIDE'] = 999;
output.inventory['T10_FIBER'] = 999;
output.inventory['T10_FISH'] = 999;
output.inventory['T10_FOOD'] = 999;
output.inventory['T10_DUNGEON_MAP'] = 100;

import fs from 'fs';
fs.writeFileSync('max_char.json', JSON.stringify(output, null, 2));
console.log("JSON written to max_char.json");

