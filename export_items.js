import { ITEM_LOOKUP, resolveItem, QUALITIES } from './shared/items.js';
import fs from 'fs';

const items = [];
const headers = ['ID', 'Name', 'Tier', 'Type', 'Rarity', 'HP', 'Defense', 'Damage', 'IP'];

// Iterate through all items in LOOKUP
for (const itemId in ITEM_LOOKUP) {
    const baseItem = ITEM_LOOKUP[itemId];
    const equipmentTypes = ['WEAPON', 'OFF_HAND', 'ARMOR', 'HELMET', 'BOOTS', 'GLOVES', 'CAPE'];
    const isEquipment = equipmentTypes.includes(baseItem.type);

    // For equipment, export all rarities. For others, just Normal.
    const maxQuality = isEquipment ? 4 : 0;

    for (let qId = 0; qId <= maxQuality; qId++) {
        const quality = QUALITIES[qId];
        const suffix = qId === 0 ? '' : `_Q${qId}`;
        const item = resolveItem(itemId + suffix);

        if (item) {
            items.push([
                item.id,
                item.name,
                item.tier,
                item.type,
                item.qualityName,
                item.stats?.hp || 0,
                item.stats?.defense || 0,
                item.stats?.damage || 0,
                item.ip === undefined || isNaN(item.ip) ? 'undefined' : item.ip
            ]);
        }
    }
}

const csvContent = [
    headers.join(','),
    ...items.map(row => row.join(','))
].join('\n');

fs.writeFileSync('items_export.csv', csvContent);
console.log('Exported ' + items.length + ' items to items_export.csv');
