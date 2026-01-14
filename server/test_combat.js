
import { GameManager } from './GameManager.js';
import { MONSTERS } from './data/monsters.js';

// Mock Mock Supabase
const mockSupabase = {};

class MockGameManager extends GameManager {
    constructor() {
        super(mockSupabase);
        this.characters = {}; // Mock DB in memory
    }

    // Override to use in-memory mock
    async getCharacter(userId) {
        if (this.characters[userId]) {
            return this.characters[userId];
        }
        return null;
    }

    // Override to save to in-memory mock
    async saveState(userId, state) {
        if (this.characters[userId]) {
            this.characters[userId].state = state;
        }
    }
}

const runTests = async () => {
    const gm = new MockGameManager();
    console.log("=== INICIANDO TESTES DO SISTEMA DE COMBATE ===");

    // ==========================================
    // SETUP
    // ==========================================
    const charId = 'fighter_test';
    const TEST_MOB_ID = 'T1_RAT'; // Assuming this exists in T1 monsters

    // Validar se mob existe pra não quebrar teste
    let mobData = null;
    if (MONSTERS[1]) mobData = MONSTERS[1].find(m => m.id === TEST_MOB_ID);

    if (!mobData) {
        // Fallback mock if T1_RAT changed
        console.warn("⚠️ Mob teste T1_RAT não encontrado, criando mock...");
        mobData = { id: 'TEST_MOB', name: 'Test Mob', hp: 20, damage: 2, xp: 10, silver: [5, 10] };
        MONSTERS[1] = [mobData];
    } else {
        console.log(`[SETUP] Mob alvo: ${mobData.name} (HP: ${mobData.hp}, Dmg: ${mobData.damage})`);
    }

    const initialChar = {
        id: charId,
        name: 'Fighter',
        state: {
            health: 100,
            stats: { str: 5, vit: 0 }, // Dmg = 5 + 5 = 10. HP = 100.
            inventory: {},
            skills: { 'COMBAT': { xp: 0, level: 1 } },
            combat: {
                mobId: mobData.id,
                mobName: mobData.name,
                mobHealth: mobData.hp,
                mobMaxHealth: mobData.hp,
                tier: 1,
                playerHealth: 100
            }
        }
    };
    gm.characters[charId] = initialChar;

    console.log(`[SETUP] Char HP: ${initialChar.state.health}, Dano Est.: ${5 + 5}`);
    console.log(`[SETUP] Mob HP: ${initialChar.state.combat.mobHealth}`);

    // ==========================================
    // TESTE 1: Round de Combate (Dano)
    // ==========================================
    console.log("\n--- Teste 1: Processar Round (Dano Mútuo) ---");

    let result = await gm.processCombatRound(initialChar);

    const char = await gm.getCharacter(charId);

    // Player Dano: 5 base + 5 str = 10
    // Mob HP: 20 - 10 = 10
    if (char.state.combat.mobHealth === mobData.hp - 10) {
        console.log(`✅ [PASS] Dano no Mob correto. HP: ${char.state.combat.mobHealth}/${mobData.hp}`);
    } else {
        console.error(`❌ [FAIL] Dano no Mob incorreto. HP: ${char.state.combat.mobHealth}`);
    }

    // Mob Dano: 2 (mock/real)
    // Player HP: 100 - 2 = 98
    const expectedHp = 100 - mobData.damage;
    if (char.state.combat.playerHealth === expectedHp && char.state.health === expectedHp) {
        console.log(`✅ [PASS] Dano no Player correto. HP: ${char.state.health}`);
    } else {
        console.error(`❌ [FAIL] Dano no Player incorreto. HP: ${char.state.health}`);
    }

    // ==========================================
    // TESTE 2: Vitória e Recompensas
    // ==========================================
    console.log("\n--- Teste 2: Vitória (Mob Die) ---");
    // Próximo hit deve matar (HP 10 -> 0)

    const preSilver = char.state.silver || 0;
    const preXp = char.state.skills.COMBAT.xp;

    result = await gm.processCombatRound(char);

    if (result.details.victory === true) {
        console.log("✅ [PASS] Vitória detectada.");
    } else {
        console.error("❌ [FAIL] Vitória NÃO detectada.");
    }

    if (char.state.combat.mobHealth === char.state.combat.mobMaxHealth) {
        console.log("✅ [PASS] Auto-Respawn funcionou (HP restaurado).");
    } else {
        console.error("❌ [FAIL] Auto-Respawn falhou.");
    }

    if (char.state.silver > preSilver) {
        console.log(`✅ [PASS] Silver ganho: ${char.state.silver - preSilver}`);
    } else {
        console.warn("⚠️ [WARN] Nenhum silver ganho (pode ser chance/range).");
    }

    if (char.state.skills.COMBAT.xp > preXp) {
        console.log(`✅ [PASS] XP ganho: ${char.state.skills.COMBAT.xp - preXp}`);
    } else {
        console.error("❌ [FAIL] XP não computado.");
    }

    // ==========================================
    // TESTE 3: Derrota do Jogador
    // ==========================================
    console.log("\n--- Teste 3: Derrota do Jogador ---");
    // Set HP to low
    char.state.combat.playerHealth = 1;
    char.state.health = 1;

    // Mob hit (2 dmg) > 1 HP -> Death
    result = await gm.processCombatRound(char);

    if (result.details.defeat === true) {
        console.log("✅ [PASS] Derrota detectada.");
    } else {
        console.error("❌ [FAIL] Derrota NÃO detectada.");
    }

    if (!char.state.combat) {
        console.log("✅ [PASS] Estado de combate limpo após morte.");
    } else {
        console.error("❌ [FAIL] Combate ainda ativo após morte:", char.state.combat);
    }

    console.log("\n=== FIM DOS TESTES ===");
};

runTests();
