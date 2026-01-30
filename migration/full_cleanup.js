import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env.migration') });

const supabase = createClient(process.env.NEW_SUPABASE_URL, process.env.NEW_SERVICE_ROLE_KEY);

async function cleanAll() {
    console.log("🔥 INICIANDO LIMPEZA TOTAL DE DADOS (Para corrigir IDs) 🔥");

    // Order matters because of Foreign Keys
    const tables = [
        'combat_history',
        'dungeon_history',
        'user_sessions',
        'market_listings',
        'messages',
        'characters'
    ];

    for (const table of tables) {
        console.log(`🗑️ Deletando tudo de: ${table}...`);

        // Check if table exists first? Supabase delete won't fail if table empty, but might if not exists.
        // We assume they exist.
        const { error } = await supabase.from(table).delete().neq('id', 0); // Hacky "delete all" using a condition that matches everything usually?
        // neq 'id' 0 might not work for UUIDs. 
        // Better: .gte('id', '00000000-0000-0000-0000-000000000000') (if UUID) or ID > 0 (if int).
        // Let's try separate strategy based on table.

        let query = supabase.from(table).delete();
        if (table === 'messages') query = query.gt('id', 0); // BigInt
        else query = query.neq('id', '00000000-0000-0000-0000-000000000000'); // UUID

        const { error: err } = await query;

        if (err) {
            console.error(`❌ Erro limpar ${table}:`, err.message);
        } else {
            console.log(`✅ ${table} limpo.`);
        }
    }

    console.log("✨ Limpeza concluída!");
}

cleanAll();
