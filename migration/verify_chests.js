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

async function verifyChests() {
    console.log("Verifying Chest Migration...");

    const { data: chars, error } = await supa
        .from('characters')
        .select('id, name, state');

    if (error) {
        console.error("Error fetching chars:", error);
        return;
    }

    let foundLegacy = 0;

    for (const char of chars) {
        const state = char.state || {};
        const inventory = state.inventory || {};

        const legacyItems = Object.keys(inventory).filter(k =>
            k.includes('_CHEST_COMMON') ||
            k.includes('_CHEST_RARE') ||
            k.includes('_CHEST_GOLD') ||
            k.includes('_CHEST_MYTHIC') ||
            k.includes('_DUNGEON_CHEST')
        );

        if (legacyItems.length > 0) {
            console.log(`[ALERT] Character ${char.name} (${char.id}) still has legacy chests:`, legacyItems);
            foundLegacy++;
        }
    }

    if (foundLegacy === 0) {
        console.log("SUCCESS: No legacy chests found in any inventory.");
    } else {
        console.error(`FAILURE: Found ${foundLegacy} characters with legacy chests.`);
    }
}

verifyChests();
