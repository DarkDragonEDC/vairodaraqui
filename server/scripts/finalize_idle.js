import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { GameManager } from '../GameManager.js';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Erro: Credenciais do Supabase não encontradas no .env");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const gameManager = new GameManager(supabase);

async function finalizeAll() {
    console.log("Iniciando finalização de atividades idle...");

    // Buscar todos os personagens que possuem atividade ou combate ativo
    const { data: characters, error } = await supabase
        .from('characters')
        .select('id, user_id, name')
        .or('current_activity.not.is.null,state->combat.not.is.null,state->dungeon.not.is.null');

    if (error) {
        console.error("Erro ao buscar personagens:", error);
        return;
    }

    console.log(`Encontrados ${characters.length} personagens para processar.`);

    for (const char of characters) {
        try {
            console.log(`Processando catch-up para: ${char.name} (${char.id})`);
            // Chamar getCharacter com catchup = true força o processamento offline e salva no banco
            const updatedChar = await gameManager.getCharacter(char.user_id, char.id, true);

            if (updatedChar.offlineReport) {
                console.log(` - Relatório offline gerado para ${char.name}. Tempo processado: ${updatedChar.offlineReport.totalTime}s`);
            } else {
                console.log(` - Nenhum processamento offline necessário para ${char.name}.`);
            }
        } catch (err) {
            console.error(`Erro ao processar ${char.name}:`, err.message);
        }
    }

    console.log("Finalização concluída.");
    process.exit(0);
}

finalizeAll();
