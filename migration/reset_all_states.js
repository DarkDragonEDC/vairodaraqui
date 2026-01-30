import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env.migration') });

const supabase = createClient(process.env.NEW_SUPABASE_URL, process.env.NEW_SERVICE_ROLE_KEY);

async function resetStates() {
    console.log("🚑 Iniciando Desbloqueio Global de Personagens...");

    let page = 0;
    const pageSize = 1000;

    while (true) {
        const { data: chars, error } = await supabase
            .from('characters')
            .select('id, name, state')
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
            console.error("Erro ao ler:", error);
            break;
        }

        if (!chars || chars.length === 0) break;

        console.log(`Processando lote ${page + 1} (${chars.length} chars)...`);

        for (const char of chars) {
            let updated = false;
            const updates = {};

            // 1. Limpar Current Activity
            updates.current_activity = null;
            updates.activity_started_at = null;

            // 2. Limpar Combat/Dungeon do State
            const newState = { ...char.state };

            if (newState.combat) {
                delete newState.combat;
                updated = true;
            }
            if (newState.dungeon) {
                delete newState.dungeon;
                updated = true;
            }

            // Sempre limpamos current_activity na raiz também
            updates.state = newState;

            const { error: updateError } = await supabase
                .from('characters')
                .update(updates)
                .eq('id', char.id);

            if (updateError) {
                console.error(`❌ Falha ao limpar ${char.name}:`, updateError.message);
            }
        }

        page++;
    }

    console.log("✅ Todos os personagens foram resetados para o estado IDLE.");
}

resetStates();
