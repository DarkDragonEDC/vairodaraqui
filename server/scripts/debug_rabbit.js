import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { GameManager } from '../GameManager.js';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const gameManager = new GameManager(supabase);

async function debugRabbit() {
    console.log("=== Debugging Rabbit ===");

    const { data: char, error } = await supabase
        .from('characters')
        .select('*')
        .eq('name', 'Rabbit')
        .single();

    if (error) {
        console.error("Erro ao buscar Rabbit:", error);
        return;
    }

    console.log("Estado Atual:");
    console.log(" - ID:", char.id);
    console.log(" - User ID:", char.user_id);
    console.log(" - Last Saved:", char.last_saved);
    console.log(" - Activity:", char.current_activity ? char.current_activity.type : "None");
    if (char.current_activity) {
        console.log("   - Remaining:", char.current_activity.actions_remaining);
    }
    console.log(" - Combat:", char.state.combat ? "Active" : "None");
    if (char.state.combat) {
        console.log("   - Started At:", char.state.combat.started_at);
        console.log("   - Next Attack At:", char.state.combat.next_attack_at);
    }

    const lastSaved = new Date(char.last_saved).getTime();
    const elapsed = (Date.now() - lastSaved) / 1000;
    console.log(" - Tempo decorrido desde o último save:", elapsed, "s (", (elapsed / 3600).toFixed(2), "h )");

    console.log("\nExecutando getCharacter com catchup...");
    const updated = await gameManager.getCharacter(char.user_id, char.id, true);

    console.log("\nResultado:");
    console.log(" - Activity:", updated.current_activity ? updated.current_activity.type : "None");
    console.log(" - Combat:", updated.state.combat ? "Active" : "None");
    if (updated.offlineReport) {
        console.log(" - Offline Report:", JSON.stringify(updated.offlineReport, null, 2));
    } else {
        console.log(" - Nenhum relatório offline gerado.");
    }
}

debugRabbit();
