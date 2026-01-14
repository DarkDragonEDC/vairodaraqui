import { useState, useEffect, useRef } from 'react';

const calculateNextLevelXP = (level) => {
    return Math.floor(100 * Math.pow(1.15, level - 1));
};

const getSkillKey = (type, itemId) => {
    if (type === 'GATHERING') {
        if (itemId.includes('WOOD')) return 'LUMBERJACK';
        if (itemId.includes('ORE')) return 'ORE_MINER';
        if (itemId.includes('HIDE')) return 'ANIMAL_SKINNER';
        if (itemId.includes('FIBER')) return 'FIBER_HARVESTER';
        if (itemId.includes('FISH')) return 'FISHING';
    }
    if (type === 'REFINING') {
        if (itemId.includes('PLANK')) return 'PLANK_REFINER';
        if (itemId.includes('BAR')) return 'METAL_BAR_REFINER';
        if (itemId.includes('LEATHER')) return 'LEATHER_REFINER';
        if (itemId.includes('CLOTH')) return 'CLOTH_REFINER';
    }
    if (type === 'CRAFTING') {
        if (itemId.includes('SWORD') || itemId.includes('PLATE') || itemId.includes('PICKAXE') || itemId.includes('SHIELD')) return 'WARRIOR_CRAFTER';
        if (itemId.includes('BOW') || itemId.includes('LEATHER') || itemId.includes('AXE') || itemId.includes('TORCH')) return 'HUNTER_CRAFTER';
        if (itemId.includes('STAFF') || itemId.includes('CLOTH') || itemId.includes('SICKLE') || itemId.includes('TOME')) return 'MAGE_CRAFTER';
        if (itemId.includes('FOOD')) return 'COOKING';
        if (itemId.includes('CAPE')) return 'WARRIOR_CRAFTER';
    }
    return null;
};

const addItemToInventory = (state, itemId, amount) => {
    if (!state.state.inventory) state.state.inventory = {};
    const inv = state.state.inventory;
    inv[itemId] = (inv[itemId] || 0) + amount;
    if (inv[itemId] <= 0) delete inv[itemId];
};

const consumeItems = (state, req) => {
    if (!req) return;
    const inv = state.state.inventory;
    Object.entries(req).forEach(([id, amount]) => {
        if (inv[id]) {
            inv[id] -= amount;
            if (inv[id] <= 0) delete inv[id];
        }
    });
};

const addXP = (state, skillKey, amount) => {
    if (!skillKey || !state.state.skills[skillKey]) return;
    const skill = state.state.skills[skillKey];
    skill.xp += amount;

    let nextLevelXP = calculateNextLevelXP(skill.level);
    while (skill.xp >= nextLevelXP && skill.level < 100) {
        skill.level++;
        skill.xp -= nextLevelXP;
        nextLevelXP = calculateNextLevelXP(skill.level);
    }
};

export function useOptimisticState(authoritativeState) {
    const [localState, setLocalState] = useState(authoritativeState);
    const clockOffset = useRef(0);

    useEffect(() => {
        if (authoritativeState) {
            setLocalState(authoritativeState);
            if (authoritativeState.serverTime) {
                clockOffset.current = authoritativeState.serverTime - Date.now();
            }
        }
    }, [authoritativeState]);

    useEffect(() => {
        if (!localState || !localState.current_activity) return;

        const timer = setInterval(() => {
            const now = Date.now() + clockOffset.current;
            setLocalState(prev => {
                if (!prev || !prev.current_activity) return prev;

                const activity = prev.current_activity;
                const nextActionAt = Number(activity.next_action_at);

                // Previsão Otimista: Se passou o tempo da próxima ação
                if (now >= nextActionAt && activity.actions_remaining > 0) {
                    console.log(`[OPTIMISTIC] Simulating action completion for ${activity.item_id}. Remaining: ${activity.actions_remaining - 1}`);
                    const newState = JSON.parse(JSON.stringify(prev));
                    const act = newState.current_activity;

                    // 1. Simular Ação (Coleta/Refino/Craft)
                    act.actions_remaining -= 1;
                    act.next_action_at = now + (act.time_per_action * 1000);

                    // 2. Simular Recompensas (Inventory/XP)
                    // Buscamos o item nos metadados (ITEMS) se necessário? 
                    // No client, 'App.js' usa ITEMS, mas aqui vamos tentar inferir ou usar o que vem do activity.
                    // Para simplificar, assumimos XP base
                    const skillKey = getSkillKey(act.type, act.item_id);

                    if (act.type === 'GATHERING') {
                        addItemToInventory(newState, act.item_id, 1);
                        addXP(newState, skillKey, 10); // Valor genérico, o server corrigirá
                    } else if (act.type === 'REFINING' || act.type === 'CRAFTING') {
                        // Nota: Consumo de ingredientes no refino/craft é mais complexo sem os dados completos
                        // Mas podemos tentar se o act.req estiver disponível (enviado pelo server ou App)
                        if (act.req) consumeItems(newState, act.req);
                        addItemToInventory(newState, act.item_id, 1);
                        addXP(newState, skillKey, 25);
                    }

                    if (act.actions_remaining <= 0) {
                        newState.current_activity = null;
                        newState.activity_started_at = null;
                    }

                    return newState;
                }
                return prev;
            });
        }, 500); // Check faster (500ms) for smoother response

        return () => clearInterval(timer);
    }, [localState?.current_activity?.next_action_at]);

    // Simulação de Combate (Simple HP prediction)
    useEffect(() => {
        if (!localState || !localState.state?.combat) return;

        const combatTimer = setInterval(() => {
            setLocalState(prev => {
                if (!prev || !prev.state?.combat) return prev;
                const newState = JSON.parse(JSON.stringify(prev));
                const combat = newState.state.combat;

                // Simulação visual de dano (aprox 1s)
                // Se o servidor manda update, ele sobrescreve isso aqui (Perfect Sync)
                // combat.mobHealth -= 5; 

                return newState;
            });
        }, 1000);

        return () => clearInterval(combatTimer);
    }, [localState?.state?.combat]);

    return localState;
}
