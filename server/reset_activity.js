
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing credentials");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function resetActivity() {
    // Get first character to test (assuming single user dev env)
    // Or hardcode ID if known from logs: 5d415217-c194-407a-b914-34442903d0e2
    const userId = '5d415217-c194-407a-b914-34442903d0e2';

    console.log(`Resetting activity for ${userId}...`);

    const { data: char } = await supabase.from('characters').select('*').eq('id', userId).single();

    if (!char) {
        console.error("Character not found");
        return;
    }

    if (!char.current_activity) {
        console.log("No current activity to backdate. Starting one...");
        // Start a dummy activity if none
        char.current_activity = {
            type: 'GATHERING',
            item_id: 'RAW_WOOD_T1',
            actions_remaining: 100,
            initial_quantity: 100,
            time_per_action: 3
        };
    }

    // Set started_at and last_saved to 2 hours ago
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    // Reset actions remaining to force some to happen
    char.current_activity.actions_remaining = 100;

    const { error } = await supabase
        .from('characters')
        .update({
            current_activity: char.current_activity,
            activity_started_at: twoHoursAgo,
            last_saved: twoHoursAgo
        })
        .eq('id', userId);

    if (error) console.error("Error update:", error);
    else console.log("Activity Reset! Now refresh the browser to see offline gains.");
}

resetActivity();
