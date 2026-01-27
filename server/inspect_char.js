
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function inspect(charId) {
    const { data, error } = await supabase.from('characters').select('name, state, current_activity').eq('id', charId).single();
    if (error) {
        console.error("Error fetching char:", error.message);
        return;
    }
    console.log(`Character: ${data.name}`);
    console.log(`Current Activity: ${JSON.stringify(data.current_activity)}`);
    console.log(`Notifications Count: ${data.state?.notifications?.length || 0}`);
    console.log(`Last 3 Notifications:`);
    console.log(JSON.stringify(data.state?.notifications?.slice(0, 3), null, 2));
}

inspect('776f6c2a-4aa0-48f7-afeb-9b1d4432a3cd').catch(console.error);
