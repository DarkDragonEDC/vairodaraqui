import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function cleanup() {
    console.log("Iniciando limpeza profunda baseada em started_at...");

    const { data: characters, error } = await supabase
        .from('characters')
        .select('id, name, state, current_activity, activity_started_at');

    if (error) {
        console.error("Erro ao buscar personagens:", error);
        return;
    }

    const now = Date.now();
    const limit = 43200 * 1000; // 12 hours in ms
    let cleanedCount = 0;

    for (const char of characters) {
        let needsUpdate = false;
        const newState = { ...char.state };
        let newActivity = char.current_activity;

        // Verificar Combate
        if (char.state.combat && char.state.combat.started_at) {
            const combatElapsed = now - new Date(char.state.combat.started_at).getTime();
            if (combatElapsed > limit) {
                console.log(`Limpando COMBATE de ${char.name} - Durando por ${(combatElapsed / 3600000).toFixed(2)}h`);
                delete newState.combat;
                needsUpdate = true;
            }
        }

        // Verificar Dungeon
        if (char.state.dungeon && char.state.dungeon.started_at) {
            const dungeonElapsed = now - new Date(char.state.dungeon.started_at).getTime();
            if (dungeonElapsed > limit) {
                console.log(`Limpando DUNGEON de ${char.name} - Durando por ${(dungeonElapsed / 3600000).toFixed(2)}h`);
                delete newState.dungeon;
                needsUpdate = true;
            }
        }

        // Verificar Atividade (REFINING, GATHERING, CRAFTING)
        if (char.current_activity && char.activity_started_at) {
            const activityElapsed = now - new Date(char.activity_started_at).getTime();
            if (activityElapsed > limit) {
                console.log(`Limpando ATIVIDADE de ${char.name} - Durando por ${(activityElapsed / 3600000).toFixed(2)}h`);
                newActivity = null;
                needsUpdate = true;
            }
        }

        if (needsUpdate) {
            const { error: updateError } = await supabase
                .from('characters')
                .update({
                    current_activity: newActivity,
                    state: newState,
                    last_saved: new Date().toISOString()
                })
                .eq('id', char.id);

            if (updateError) {
                console.error(`Erro ao atualizar ${char.name}:`, updateError);
            } else {
                cleanedCount++;
            }
        }
    }

    console.log(`Limpeza profunda concluída. ${cleanedCount} personagens ajustados.`);
    process.exit(0);
}

cleanup();
