import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function cleanup() {
    console.log("Iniciando limpeza de personagens com inatividade > 12h...");

    const { data: characters, error } = await supabase
        .from('characters')
        .select('id, name, last_saved, state, current_activity');

    if (error) {
        console.error("Erro ao buscar personagens:", error);
        return;
    }

    const now = new Date();
    let cleanedCount = 0;

    for (const char of characters) {
        if (!char.last_saved) continue;

        const lastSaved = new Date(char.last_saved).getTime();
        const elapsedSeconds = (now.getTime() - lastSaved) / 1000;

        if (elapsedSeconds > 43200) { // 12 hours
            console.log(`Limpando ${char.name} (${char.id}) - Inativo por ${(elapsedSeconds / 3600).toFixed(2)}h`);

            const newState = { ...char.state };
            if (newState.combat) delete newState.combat;
            if (newState.dungeon) delete newState.dungeon;

            const { error: updateError } = await supabase
                .from('characters')
                .update({
                    current_activity: null,
                    state: newState,
                    last_saved: now.toISOString()
                })
                .eq('id', char.id);

            if (updateError) {
                console.error(`Erro ao atualizar ${char.name}:`, updateError);
            } else {
                cleanedCount++;
            }
        }
    }

    console.log(`Limpeza concluída. ${cleanedCount} personagens limpos.`);
    process.exit(0);
}

cleanup();
