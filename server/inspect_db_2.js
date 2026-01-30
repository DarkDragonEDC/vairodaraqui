
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vksxfedvhhlttvxvrpmw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrc3hmZWR2aGhsdHR2eHZycG13Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI3MjY5OCwiZXhwIjoyMDgzODQ4Njk4fQ.-PRKE6iSk7GJ_B7JJms1Mcf2DkZoq-0xrpxu_V2zKqw';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function inspect() {
    console.log("Inspecting DB...");
    const { data, error } = await supabase
        .from('characters')
        .select('id, name, state');

    if (error) {
        console.error("Error:", error);
        return;
    }

    for (const char of data) {
        const inv = char.state?.inventory || {};
        const potion = inv['T10_POTION_XP'];
        const chest = inv['T10_CHEST_MASTERPIECE'];

        if (chest || potion) {
            console.log(`\n!!! FOUND IN ${char.name} !!!`);
            if (chest) console.log(`[DB] T10_CHEST_MASTERPIECE: ${chest}`);
            if (potion) console.log(`[DB] T10_POTION_XP: ${potion}`);
        }
    }
}

inspect();
