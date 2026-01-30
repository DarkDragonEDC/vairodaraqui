import { createClient } from '@supabase/supabase-js';
import { io } from 'socket.io-client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env.migration') });

// Use ANON key for login (simulate client)
const supabase = createClient(process.env.NEW_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY || process.env.NEW_SERVICE_ROLE_KEY);

const email = 'euller.edc@gmail.com';
const password = 'armario123';
const SOCKET_URL = 'https://vairodaraqui-fj1t.onrender.com';

async function testSocket() {
    console.log(`1. Logando como ${email}...`);

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        console.error("❌ Falha no login:", error.message);
        process.exit(1);
    }

    const token = data.session.access_token;
    console.log("✅ Login com sucesso! Obtendo user ID:", data.user.id);

    // Agora tenta conectar no socket
    console.log(`2. Conectando no Socket: ${SOCKET_URL}...`);

    const socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket'],
        reconnection: false
    });

    socket.on('connect', () => {
        console.log("✅✅✅ CONECTADO COM SUCESSO! ✅✅✅");
        console.log("O servidor ACEITOU o token do NOVO Supabase.");
        console.log("Isso significa que as variáveis de ambiente ESTÃO CORRETAS.");
        socket.emit('join_character', { characterId: 'fake-id-just-to-test' }); // Just to see if it replies
        setTimeout(() => process.exit(0), 3000);
    });

    socket.on('connect_error', (err) => {
        console.error("❌❌❌ ERRO DE CONEXÃO ❌❌❌");
        console.error("Mensagem:", err.message);
        if (err.message.includes("Authentication error") || err.message.includes("Invalid token") || err.message.includes("jwt")) {
            console.error("\nDIAGNÓSTICO: O Servidor REJEITOU o token Novo.");
            console.error("Isso confirma que o SERVIDOR (Render) ainda está usando a CHAVE ANTIGA (Old Secret).");
            console.error("Apesar de você ter dito que atualizou, ele não deve ter reiniciado ou não salvou.");
        }
        process.exit(1);
    });

    socket.on('status_update', (status) => {
        console.log("Recebido status_update! Sync funcionando.");
    });
}

testSocket();
