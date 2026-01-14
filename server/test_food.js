
import { GameManager } from './GameManager.js';
import { ITEMS } from './data/items.js';

// Mock Mock Supabase (not used in our overrides but constructor needs it)
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
    console.log("=== INICIANDO TESTES DO SISTEMA DE FOOD ===");

    // ==========================================
    // SETUP
    // ==========================================
    const charId = 'tester';
    const initialChar = {
        id: charId,
        name: 'Tester',
        state: {
            health: 50,
            stats: { vit: 0 }, // Max HP 100
            inventory: {
                'T1_FOOD': 5 // Carrot Soup: Heal 50
            },
            equipment: {}
        }
    };
    gm.characters[charId] = initialChar;

    console.log(`[SETUP] Char HP: ${initialChar.state.health}/100`);
    console.log(`[SETUP] Inventory:`, initialChar.state.inventory);

    // ==========================================
    // TESTE 1: Equipar Comida (Stack)
    // ==========================================
    console.log("\n--- Teste 1: Equipar Comida ---");
    try {
        await gm.equipItem(charId, 'T1_FOOD');
        const char = await gm.getCharacter(charId);

        if (char.state.equipment.food && char.state.equipment.food.id === 'T1_FOOD' && char.state.equipment.food.amount === 5) {
            console.log("✅ [PASS] Comida equipada corretamente com stack (5).");
        } else {
            console.error("❌ [FAIL] Falha ao equipar comida.", char.state.equipment);
        }

        if (!char.state.inventory['T1_FOOD']) {
            console.log("✅ [PASS] Comida removida do inventário.");
        } else {
            console.error("❌ [FAIL] Comida ainda está no inventário.", char.state.inventory);
        }
    } catch (e) {
        console.error("❌ [FAIL] Erro ao equipar:", e);
    }

    // ==========================================
    // TESTE 2: Auto-Eat (Não deve comer se desperdiçar)
    // ==========================================
    console.log("\n--- Teste 2: Consumo Inteligente (Não Comer) ---");
    // HP 50/100. Missing 50. Heal 50.
    // Regra: missing > heal. 50 > 50 é FALSE.
    // Não deve comer.

    let char = await gm.getCharacter(charId);
    let used = gm.processFood(char);

    if (used === false) {
        console.log(`✅ [PASS] Comida não usada (HP 50/100, Heal 50). Eficiência preservada.`);
    } else {
        console.error(`❌ [FAIL] Comida foi usada indevidamente!`);
    }

    // ==========================================
    // TESTE 3: Auto-Eat (Deve comer se necessário)
    // ==========================================
    console.log("\n--- Teste 3: Consumo Inteligente (Comer) ---");
    // Baixar HP para 49. Missing 51. 51 > 50. Deve comer.
    char.state.health = 49;
    used = gm.processFood(char);

    if (used === true) {
        console.log(`✅ [PASS] Comida usada (HP 49/100, Heal 50).`);

        if (char.state.health === 99) {
            console.log(`✅ [PASS] HP atualizado para 99/100.`);
        } else {
            console.error(`❌ [FAIL] HP incorreto: ${char.state.health}`);
        }

        if (char.state.equipment.food.amount === 4) {
            console.log(`✅ [PASS] Stack decrementado para 4.`);
        } else {
            console.error(`❌ [FAIL] Stack incorreto: ${char.state.equipment.food.amount}`);
        }

    } else {
        console.error(`❌ [FAIL] Comida NÃO foi usada quando deveria!`);
    }

    // ==========================================
    // TESTE 4: Auto-Eat (Consumir último item)
    // ==========================================
    console.log("\n--- Teste 4: Consumir Último Item ---");
    // Set stack to 1
    char.state.equipment.food.amount = 1;
    char.state.health = 10; // Missing 90 > 50. Deve comer.

    used = gm.processFood(char);

    if (used === 'consumed_all') { // verify my logic return 'consumed_all'
        console.log("✅ [PASS] Retornou 'consumed_all'.");
    } else if (used === true) {
        // Check if slot deleted
        if (!char.state.equipment.food) {
            console.log("✅ [PASS] Slot de comida removido após último uso.");
        } else {
            console.error("❌ [FAIL] Slot de comida ainda existe (amount 0?)", char.state.equipment.food);
        }
    }

    if (char.state.health === 60) {
        console.log(`✅ [PASS] HP recuperado para 60.`);
    }

    // ==========================================
    // TESTE 5: Desequipar
    // ==========================================
    console.log("\n--- Teste 5: Desequipar (Se ainda houvesse) ---");
    // Vamos adicionar de novo manualmente para testar unequip
    char.state.inventory['T1_FOOD'] = 5;
    await gm.equipItem(charId, 'T1_FOOD'); // Equip 5

    // Unequip
    await gm.unequipItem(charId, 'food');

    if (!char.state.equipment.food) {
        console.log("✅ [PASS] Slot food vazio.");
    }

    if (char.state.inventory['T1_FOOD'] === 5) {
        console.log("✅ [PASS] 5 itens devolvidos ao inventário.");
    } else {
        console.error("❌ [FAIL] Inventário incorreto após unequip:", char.state.inventory);
    }

    console.log("\n=== FIM DOS TESTES ===");
};

runTests();
