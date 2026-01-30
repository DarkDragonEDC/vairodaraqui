import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// ESM __dirname fix
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load env
const envPaths = [
    path.join(__dirname, '.env.migration'),
    path.resolve(process.cwd(), 'migration', '.env.migration'),
    path.resolve(process.cwd(), '.env.migration')
];

let envLoaded = false;
for (const p of envPaths) {
    if (fs.existsSync(p)) {
        console.log(`Loading env from: ${p}`);
        dotenv.config({ path: p });
        envLoaded = true;
        break;
    }
}
if (!envLoaded) {
    console.warn("Could not find .env.migration in standard locations.");
    dotenv.config(); // Fallback
}

const supabaseUrl = process.env.NEW_SUPABASE_URL;
// Use Service Role Key for admin tasks (bypass RLS)
const supabaseKey = process.env.NEW_SERVICE_ROLE_KEY || process.env.NEW_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing NEW_SUPABASE_URL or NEW_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supa = createClient(supabaseUrl, supabaseKey);

async function migrateChests() {
    console.log("Starting Chest Migration...");

    // 1. Fetch all characters
    const { data: chars, error } = await supa
        .from('characters')
        .select('id, name, state');

    if (error) {
        console.error("Error fetching chars:", error);
        return;
    }

    console.log(`Found ${chars.length} characters to check.`);

    let updatedCount = 0;

    for (const char of chars) {
        // Inventory is inside state JSONB
        const state = char.state || {};
        const inventory = state.inventory || {};

        // Skip if inventory is empty
        if (Object.keys(inventory).length === 0) continue;

        let modified = false;
        const newInventory = {};

        for (const [key, val] of Object.entries(inventory)) {
            let newKey = key;

            // Logic: T{t}_CHEST_{OLD} -> T{t}_CHEST_{NEW}
            // Logic: T{t}_DUNGEON_CHEST -> T{t}_CHEST_NORMAL

            if (key.includes('_CHEST_COMMON')) newKey = key.replace('_CHEST_COMMON', '_CHEST_NORMAL');
            else if (key.includes('_CHEST_RARE')) newKey = key.replace('_CHEST_RARE', '_CHEST_OUTSTANDING');
            else if (key.includes('_CHEST_GOLD')) newKey = key.replace('_CHEST_GOLD', '_CHEST_EXCELLENT');
            else if (key.includes('_CHEST_MYTHIC')) newKey = key.replace('_CHEST_MYTHIC', '_CHEST_MASTERPIECE');
            else if (key.includes('_DUNGEON_CHEST')) {
                newKey = key.replace('_DUNGEON_CHEST', '_CHEST_NORMAL');
            }

            if (newKey !== key) {
                console.log(`[${char.name}] Migrating ${key} -> ${newKey}`);

                // Merge if target exists
                if (newInventory[newKey]) {
                    if (typeof val === 'number') newInventory[newKey] += val;
                    else newInventory[newKey].qty += val.qty;
                } else {
                    newInventory[newKey] = val;
                }
                modified = true;
            } else {
                newInventory[key] = val;
            }
        }

        if (modified) {
            // Update the local state object
            state.inventory = newInventory;

            const { error: updateError } = await supa
                .from('characters')
                .update({ state: state })
                .eq('id', char.id);

            if (updateError) console.error(`Failed to update ${char.name}:`, updateError);
            else {
                updatedCount++;
                // console.log(`Saved ${char.name}`);
            }
        }
    }

    console.log(`Migration Complete. Updated ${updatedCount} characters.`);
}

migrateChests();
