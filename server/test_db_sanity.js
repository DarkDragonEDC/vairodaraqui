import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function test() {
    console.log("Checking characters table...");
    const { data, error } = await supabase.from('characters').select('*').limit(1);

    if (error) {
        console.error("Error fetching characters:", error.message);
        return;
    }

    if (data && data.length > 0) {
        console.log("Columns found in first character:", Object.keys(data[0]));
    } else {
        console.log("No characters found, but table exists.");
    }
}

test();
