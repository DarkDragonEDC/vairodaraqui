
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vksxfedvhhlttvxvrpmw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrc3hmZWR2aGhsdHR2eHZycG13Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI3MjY5OCwiZXhwIjoyMDgzODQ4Njk4fQ.-PRKE6iSk7GJ_B7JJms1Mcf2DkZoq-0xrpxu_V2zKqw';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fixInventory() {
    console.log("Starting Inventory Fix...");

    // 1. Fetch character
    const { data: chars, error } = await supabase
        .from('characters')
        .select('*')
        .eq('name', 'admin'); // Targeting specific user 'admin' seen in logs

    if (error || !chars || chars.length === 0) {
        console.error("Character not found", error);
        return;
    }

    const char = chars[0];
    const inv = char.state.inventory;

    console.log("Current Inventory State for T10:",
        "Potion:", inv['T10_POTION_XP'],
        "Chest:", inv['T10_CHEST_MASTERPIECE']
    );

    // 2. Modify State
    let changed = false;
    if (inv['T10_POTION_XP'] && !inv['T10_CHEST_MASTERPIECE']) {
        console.log("Converting T10_POTION_XP to T10_CHEST_MASTERPIECE...");

        inv['T10_CHEST_MASTERPIECE'] = inv['T10_POTION_XP'];
        delete inv['T10_POTION_XP'];

        changed = true;
    } else if (inv['T10_POTION_XP'] && inv['T10_CHEST_MASTERPIECE']) {
        console.log("Both exist. Merging into Chest...");
        inv['T10_CHEST_MASTERPIECE'] += inv['T10_POTION_XP'];
        delete inv['T10_POTION_XP'];
        changed = true;
    }

    if (changed) {
        const { error: updateError } = await supabase
            .from('characters')
            .update({ state: char.state })
            .eq('id', char.id);

        if (updateError) console.error("Update failed:", updateError);
        else console.log("SUCCESS: Inventory updated in DB.");
    } else {
        console.log("No changes needed.");
    }
}

fixInventory();
