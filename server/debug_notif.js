
import { createClient } from '@supabase/supabase-js';
import { GameManager } from './GameManager.js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const gameManager = new GameManager(supabase);

async function test() {
    console.log("Starting debug test...");

    // 1. Find a character (e.g. named 'admin')
    const { data: chars, error } = await supabase.from('characters').select('id, user_id, name').eq('name', 'admin').limit(1);
    if (error || !chars || chars.length === 0) {
        console.error("Character 'admin' not found");
        return;
    }

    const char = chars[0];
    console.log(`Testing with char: ${char.name} (ID: ${char.id}, User: ${char.user_id})`);

    // 2. Start a fake activity
    await gameManager.executeLocked(char.user_id, async () => {
        console.log("Starting fake activity...");
        await gameManager.startActivity(char.user_id, char.id, 'GATHERING', 'T1_WOOD', 10);

        // Let's mimic some session progress
        const updatedChar = await gameManager.getCharacter(char.user_id, char.id);
        if (updatedChar.current_activity) {
            updatedChar.current_activity.sessionXp = 500;
            updatedChar.current_activity.sessionItems = { 'T1_WOOD': 5 };
            // Save this session data temporarily in DB so stopActivity finds it
            await supabase.from('characters').update({ current_activity: updatedChar.current_activity }).eq('id', char.id);
        }
    });

    // 3. Stop activity and check for notification
    console.log("Stopping activity...");
    await gameManager.executeLocked(char.user_id, async () => {
        const result = await gameManager.stopActivity(char.user_id, char.id);
        console.log("Stop Result:", result);

        const finalChar = await gameManager.getCharacter(char.user_id, char.id);
        const lastNotif = finalChar.state.notifications?.[0];
        console.log("Last Notification Type:", lastNotif?.type);
        console.log("Last Notification Message:", lastNotif?.message);

        if (lastNotif && lastNotif.type === 'SYSTEM') {
            console.log("SUCCESS: Notification generated correctly!");
        } else {
            console.log("FAILURE: Notification not found or wrong type.");
        }
    });
}

test().catch(console.error);
