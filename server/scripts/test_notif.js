import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testNotifications() {
    console.log("Iniciando teste de notificações...");

    // Pegar o personagem 'admin'
    const { data: char, error } = await supabase
        .from('characters')
        .select('*')
        .ilike('name', 'admin')
        .single();

    if (error || !char) {
        console.error("Erro ao buscar char 'admin':", error);
        return;
    }

    console.log("Char encontrado. Notificações atuais:", char.state.notifications?.length || 0);

    // Simular a função addActionSummaryNotification (já que o servidor está rodando e não queremos reiniciá-lo agora para teste unitário puro)
    // Mas o objetivo é ver se o código que injetamos vai funcionar no fluxo real.
    // Vamos apenas observar se as notificações aparecem no banco após interagirmos (ou simulamos uma interação via log do servidor se possível).

    // Como o servidor está em 'npm start', vamos olhar o console dele.
    console.log("DICA: Verifique a aba de notificações 'SYSTEM' no jogo.");
}

testNotifications();
