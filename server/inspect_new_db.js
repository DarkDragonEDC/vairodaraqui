
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rozwhqxbpsxlxbkfzvce.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvendocXhicHN4bHhia2Z6dmNlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTcyMjQxMCwiZXhwIjoyMDg1Mjk4NDEwfQ.xLoD96rYvto8JnrhvTxJfwmTxLHANcnbQQyrIc5gJ2I';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function inspectAndFix() {
    console.log("Inspecting NEW DB...");
    const { data: chars, error } = await supabase
        .from('characters')
        .select('*');

    if (error) {
        console.error("Error:", error);
        return;
    }

    console.log(`Found ${chars.length} characters.`);

    for (const char of chars) {
        let inv = char.state.inventory || {};
        let needsUpdate = false;

        // Check for Admin specifically if user is logging in as admin, but better check all.
        // Or focus on the one with the issue.
        if (inv['T10_POTION_XP']) {
            console.log(`Character ${char.name} has T10_POTION_XP: ${inv['T10_POTION_XP']}`);

            // Heuristic: If they have > 10, likely chest corruption.
            // Or if they have exactly 97 like before.
            // The user implied "My inventory" so broad check is risky.
            // But let's SEE first.
        }
        if (inv['T10_CHEST_MASTERPIECE']) {
            console.log(`Character ${char.name} has T10_CHEST_MASTERPIECE: ${inv['T10_CHEST_MASTERPIECE']}`);
        }
    }
}

inspectAndFix();
