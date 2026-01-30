import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env.migration') });

// Must use Service Role for Admin ops
const supabase = createClient(process.env.NEW_SUPABASE_URL, process.env.NEW_SERVICE_ROLE_KEY);

const NEW_PASSWORD = 'forgedlands2026';

async function resetAll() {
    console.log("🔄 Iniciando Reset Geral de Senhas...");
    console.log(`🔑 Nova Senha para TODOS: ${NEW_PASSWORD}`);

    let allUsers = [];
    let page = 1;
    const perPage = 50;

    // 1. Fetch all users
    while (true) {
        const { data: { users }, error } = await supabase.auth.admin.listUsers({
            page: page,
            perPage: perPage
        });

        if (error) {
            console.error("Erro ao listar:", error);
            break;
        }

        if (!users || users.length === 0) break;

        allUsers = allUsers.concat(users);
        console.log(`Baixados ${users.length} usuários da página ${page}...`);

        if (users.length < perPage) break; // Last page
        page++;
    }

    console.log(`📋 Total de usuários encontrados: ${allUsers.length}`);

    // 2. Update each
    let count = 0;
    for (const user of allUsers) {
        process.stdout.write(`[${count + 1}/${allUsers.length}] Resetando ${user.email}... `);

        const { error } = await supabase.auth.admin.updateUserById(
            user.id,
            { password: NEW_PASSWORD, email_confirm: true }
        );

        if (error) {
            console.log(`❌ ERRO: ${error.message}`);
        } else {
            console.log(`✅ OK`);
        }
        count++;
    }

    console.log("\n🎉 Processo finalizado!");
}

resetAll();
