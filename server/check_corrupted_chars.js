
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkCorrupted() {
    console.log("Checking for corrupted characters...");

    // Fetch all characters (or a large batch)
    const { data: chars, error } = await supabase
        .from('characters')
        .select('id, name, user_id, state');

    if (error) {
        console.error("Error fetching characters:", error.message);
        return;
    }

    console.log(`Scanned ${chars.length} characters.`);

    let corruptedCount = 0;
    const report = [];

    chars.forEach(char => {
        const issues = [];

        if (!char.state) {
            issues.push("State is NULL");
        } else {
            if (!char.state.skills) issues.push("Missing 'skills'");
            if (!char.state.stats) issues.push("Missing 'stats'");
            if (!char.state.inventory) issues.push("Missing 'inventory' (Warning only)");
        }

        if (issues.length > 0) {
            corruptedCount++;
            report.push({
                name: char.name || "Unknown/No Name",
                id: char.id,
                userId: char.user_id,
                issues: issues.join(', ')
            });
        }
    });

    if (corruptedCount === 0) {
        console.log("✅ No corrupted characters found!");
    } else {
        console.log(`❌ Found ${corruptedCount} corrupted characters:\n`);
        report.forEach(r => {
            console.log(`- Name: "${r.name}" (ID: ${r.id})`);
            console.log(`  Issues: ${r.issues}`);
            console.log(`  User ID: ${r.userId}\n`);
        });
    }
}

checkCorrupted();
