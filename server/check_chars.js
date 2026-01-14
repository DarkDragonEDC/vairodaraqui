import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function check() {
    const { data, error } = await supabase.from('characters').select('*');
    if (error) {
        console.error(error);
        return;
    }

    data.forEach(char => {
        console.log('--- CHARACTER START ---');
        console.log(`NAME: ${char.name}`);
        console.log(`ACTIVITY: ${JSON.stringify(char.current_activity, null, 2)}`);
        console.log(`INVENTORY: ${JSON.stringify(char.state.inventory, null, 2)}`);
        console.log(`SKILLS: ${JSON.stringify(char.state.skills, null, 2)}`);
        console.log('--- CHARACTER END ---');
    });
}

check();
