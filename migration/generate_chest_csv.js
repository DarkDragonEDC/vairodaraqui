import fs from 'fs';
import { ITEMS } from '../shared/items.js';

const OUTPUT_FILE = '../chest_drop.csv';

function generateCSV() {
    const rows = [];
    // Header
    rows.push(['Chest ID', 'Name', 'Tier', 'Rarity', 'Refined Mat (Type)', 'Min Mat Qty', 'Max Mat Qty', 'Crest Info']);

    const chats = { ...ITEMS.SPECIAL.CHEST }; // Shallow copy to inject planned items

    // Inject "Good" (Uncommon) chests for planning
    for (const tier of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
        chats[`${tier}_GOOD`] = {
            id: `T${tier}_CHEST_GOOD`,
            name: `T${tier} Dungeon Chest (Good) [PLANNED]`,
            tier: tier,
            rarity: 'UNCOMMON',
            type: 'CONSUMABLE',
            desc: 'Planned Good Chest'
        };
    }

    // Sort keys to look nice (Tier 1 Common, Good, Rare... Tier 2...)
    const sortedKeys = Object.keys(chats).sort((a, b) => {
        const itemA = chats[a];
        const itemB = chats[b];

        // Use Tier from item data if key lookup is messy
        const tA = itemA.tier || parseInt(a.split('_')[0]);
        const tB = itemB.tier || parseInt(b.split('_')[0]);

        if (tA !== tB) return tA - tB;

        // Rarity sort logic (Common < Good < Rare < Gold < Mythic)
        const mapR = (r) => {
            if (r === 'COMMON') return 1;
            if (r === 'UNCOMMON') return 1.5;
            if (r === 'RARE') return 2;
            if (r === 'EPIC') return 3;
            if (r === 'LEGENDARY') return 4;
            return 99;
        };
        return mapR(itemA.rarity) - mapR(itemB.rarity);
    });

    for (const key of sortedKeys) {
        const item = chats[key];
        const tier = item.tier;
        const rarity = item.rarity;

        // Skip Generic/Legacy items in the report
        if (item.id.includes('DUNGEON_CHEST')) continue;

        // Materials Logic
        const baseQty = rarity === 'COMMON' ? 5 :
            rarity === 'UNCOMMON' ? 6 :
                rarity === 'RARE' ? 8 :
                    rarity === 'EPIC' ? 12 : 20;

        // Max calculation: floor(base + random*tier)
        // Max = base + tier - 1. (If tier=1, max=base).
        const minMat = baseQty;
        const maxMatCalc = tier === 1 ? baseQty : baseQty + tier - 1;

        // Crests
        let crestInfo = "0%";
        if (rarity === 'UNCOMMON') crestInfo = "1% (1x)";
        if (rarity === 'RARE') crestInfo = "3% (1x)";
        if (rarity === 'EPIC') crestInfo = "4% (1x)";
        if (rarity === 'LEGENDARY') crestInfo = "5% (1x)";

        // Map Rarity to Name and ID suffix
        let rarityName = 'Unknown';
        if (rarity === 'COMMON') rarityName = 'Normal';
        if (rarity === 'UNCOMMON') rarityName = 'Good';
        if (rarity === 'RARE') rarityName = 'Outstanding';
        if (rarity === 'EPIC') rarityName = 'Excellent';
        if (rarity === 'LEGENDARY') rarityName = 'Masterpiece';

        const newId = `T${tier}_CHEST_${rarityName.toUpperCase()}`;
        const newName = `Dungeon Chest (${rarityName})`; // Removed T{tier} prefix

        rows.push([
            newId,
            newName,
            tier,
            rarityName.toUpperCase(), // Showing Rarity Name in Rarity column too? Or keep internal code? User said "ID's to have SAME NAME as Rariy Name".
            "Random Single Type (Plank/Bar/Cloth/Leather/Extract)",
            minMat,
            maxMatCalc,
            crestInfo
        ]);
    }

    const csvContent = rows.map(r => r.join(',')).join('\n');
    fs.writeFileSync(OUTPUT_FILE, csvContent);
    console.log(`Generated ${OUTPUT_FILE} with ${rows.length - 1} entries.`);
}

generateCSV();
