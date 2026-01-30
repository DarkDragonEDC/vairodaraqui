import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env.migration') });

// Use ANON key for login (like the client does)
const supabase = createClient(process.env.NEW_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY || process.env.NEW_SERVICE_ROLE_KEY);

const email = 'euller.edc@gmail.com';
const password = 'armario123';

async function testLogin() {
    console.log(`Tentando login com ${email}...`);

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        console.error("❌ Falha no login:", error.message);
        console.error("Detalhes:", JSON.stringify(error, null, 2));
    } else {
        console.log("✅ Login com sucesso!");
        console.log("ACCESS_TOKEN_START");
        console.log(data.session.access_token);
        console.log("ACCESS_TOKEN_END");
    }
}

testLogin();
