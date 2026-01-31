import React, { useState, useEffect, useMemo, useRef } from 'react';
import { formatNumber, formatSilver } from '@utils/format';
import { Sword, Shield, Skull, Coins, Zap, Clock, Trophy, ChevronRight, User, Terminal, Activity, TrendingUp, Star, Apple } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MONSTERS } from '@shared/monsters';
import { resolveItem } from '@shared/items';

const CombatPanel = ({ socket, gameState, isMobile, onShowHistory }) => {
    const [activeTier, setActiveTier] = useState(1);
    const [battleLogs, setBattleLogs] = useState([]);
    const [sessionLoot, setSessionLoot] = useState(gameState?.state?.combat?.sessionLoot || {});

    const logsEndRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const prevCombatRef = useRef(null);
    const [isRestored, setIsRestored] = useState(false);
    const [currentTime, setCurrentTime] = useState(Date.now());
    const [isPlayerHit, setIsPlayerHit] = useState(false);
    const [isMobHit, setIsMobHit] = useState(false);
    // Removed floatingTexts state and logic as requested


    // Cálculo de Stats (Replicado do ProfilePanel para consistência)
    const stats = useMemo(() => {
        if (!gameState?.state) return { str: 0, agi: 0, int: 0, hp: 100, damage: 5, attackSpeed: 1000, defense: 0 };
        const skills = gameState.state.skills || {};
        const equipment = gameState.state.equipment || {};

        let str = 0;
        let agi = 0;
        let int = 0;

        const getLvl = (key) => (skills[key]?.level || 1);

        // STR: Warrior Class + Cooking/Fishing
        str += getLvl('ORE_MINER');
        str += getLvl('METAL_BAR_REFINER');
        str += getLvl('WARRIOR_CRAFTER');
        str += getLvl('COOKING');
        str += getLvl('FISHING');

        // AGI: Hunter Class + Woodcutting
        agi += getLvl('ANIMAL_SKINNER');
        agi += getLvl('LEATHER_REFINER');
        agi += getLvl('HUNTER_CRAFTER');
        agi += getLvl('LUMBERJACK');
        agi += getLvl('PLANK_REFINER');

        // INT: Mage Class
        int += getLvl('FIBER_HARVESTER');
        int += getLvl('CLOTH_REFINER');
        int += getLvl('MAGE_CRAFTER');
        int += getLvl('HERBALISM');
        int += getLvl('DISTILLATION');
        int += getLvl('ALCHEMY');

        // Apply Multipliers & Cap
        str = Math.min(100, str * 0.2);
        agi = Math.min(100, agi * 0.2);
        int = Math.min(100, int * (1 / 6));

        // Gear Bonuses (STR/AGI/INT)
        Object.values(equipment).forEach(item => {
            if (item) {
                const fresh = resolveItem(item.id || item.item_id);
                const statsToUse = fresh?.stats || item.stats;
                if (statsToUse) {
                    if (statsToUse.str) str += statsToUse.str;
                    if (statsToUse.agi) agi += statsToUse.agi;
                    if (statsToUse.int) int += statsToUse.int;
                }
            }
        });

        const gearDamage = Object.values(equipment).reduce((acc, item) => acc + (item?.stats?.damage || 0), 0);
        const gearDefense = Object.values(equipment).reduce((acc, item) => acc + (item?.stats?.defense || 0), 0);
        const gearHP = Object.values(equipment).reduce((acc, item) => acc + (item?.stats?.hp || 0), 0);
        const gearDmgBonus = Object.values(equipment).reduce((acc, item) => acc + (item?.stats?.dmgBonus || 0), 0);

        // Resolve Weapon Speed
        const weapon = equipment.mainHand;
        const freshWeapon = weapon ? resolveItem(weapon.id || weapon.item_id) : null;
        const weaponSpeed = freshWeapon?.stats?.speed || 1000;

        // Resolve Gear Speed (excluding weapon)
        const gearSpeedBonus = Object.entries(equipment).reduce((acc, [slot, item]) => {
            if (!item || slot === 'mainHand') return acc;
            const fresh = resolveItem(item.id || item.item_id);
            return acc + (fresh?.stats?.speed || 0);
        }, 0);

        const totalSpeed = weaponSpeed + gearSpeedBonus + (agi * 2);
        const finalAttackSpeed = Math.max(200, 2000 - totalSpeed);

        const baseDmg = 5 + str + agi + int + gearDamage;
        const finalDmg = baseDmg * (1 + gearDmgBonus);

        return {
            str, agi, int,
            hp: 100 + (str * 10) + gearHP,
            damage: Math.floor(finalDmg),
            defense: gearDefense,
            attackSpeed: finalAttackSpeed,
            globals: {
                xpYield: int * 1,
                silverYield: int * 1
            }
        };
    }, [gameState?.state]);

    const combat = gameState?.state?.combat;
    const activeMobName = combat ? combat.mobName : null;

    // Reset ou Restauração de stats quando o combate muda/inicia
    // Initialize session loot from server state whenever it updates (e.g. initial load or background update)
    useEffect(() => {
        if (gameState?.state?.combat?.sessionLoot) {
            setSessionLoot(gameState.state.combat.sessionLoot);
        }
    }, [gameState?.state?.combat?.sessionLoot]);

    // Reset ou Restauração de stats quando o combate muda/inicia
    useEffect(() => {
        if (!combat || !gameState?.name) return;

        const storageKey = `combat_${gameState.name}`;
        const saved = localStorage.getItem(storageKey);
        let loadedLogs = [];
        let loadedSessionId = null;

        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                loadedLogs = parsed.logs || [];
                loadedSessionId = parsed.startedAt;
                // sessionLoot is handled by server state now
            } catch (e) {
                console.error("Erro ao carregar sessão de combate:", e);
            }
        }

        // Se a sessão salva é a MESMA que a atual (ex: F5), apenas restaura logs
        if (loadedSessionId === combat.started_at) {
            setBattleLogs(loadedLogs.length > 30 ? loadedLogs.slice(loadedLogs.length - 30) : loadedLogs);
            setIsRestored(true);
            return;
        }

        const newLog = { id: generateLogId(), type: 'start-info', content: `Starting combat against ${combat.mobName}...` };
        const combinedLogs = [...loadedLogs, newLog];

        // Pruning: Keep only last 5 'start' markers
        const startMarkers = combinedLogs.filter(l => l.type === 'start-info');
        if (startMarkers.length > 5) {
            const cutoffIndex = combinedLogs.findIndex(l => l === startMarkers[startMarkers.length - 5]);
            setBattleLogs(combinedLogs.slice(cutoffIndex));
        } else {
            setBattleLogs(combinedLogs);
        }

        setIsRestored(true);
    }, [combat?.started_at, combat?.mobId, gameState?.name]);

    // Salvar progresso no localStorage sempre que mudar
    useEffect(() => {
        if (!combat || !gameState?.name || !isRestored) return;

        const storageKey = `combat_${gameState.name}`;
        const data = {
            mobId: combat.mobId,
            startedAt: combat.started_at, // Save ID to separate sessions
            logs: battleLogs
            // Loot not saved here anymore, relies on server
        };
        localStorage.setItem(storageKey, JSON.stringify(data));
    }, [battleLogs, combat?.mobId, combat?.started_at, gameState?.name, isRestored]);

    // Limpar storage quando o combate acaba explicitamente (não apenas no mount)
    useEffect(() => {
        // Se tínhamos combate e agora não temos (e o gameState está carregado), então acabou
        if (prevCombatRef.current && !combat && gameState?.name) {
            localStorage.removeItem(`combat_${gameState.name}`);
            setIsRestored(false);
            setSessionLoot({});
        }
        prevCombatRef.current = combat;
    }, [combat, gameState?.name]);

    const logIdRef = useRef(0);
    const generateLogId = () => {
        logIdRef.current += 1;
        return `${Date.now()}-${logIdRef.current}`;
    };

    // Listen for real-time battle events
    useEffect(() => {
        if (!socket) return;

        const handleActionResult = (result) => {
            const newLogs = [];

            if (result.healingUpdate && result.healingUpdate.amount > 0) {
                newLogs.push({
                    id: generateLogId(),
                    type: 'heal',
                    content: `You healed for ${result.healingUpdate.amount} HP.`,
                    color: '#4caf50'
                });
            }

            if (result.combatUpdate) {
                const update = result.combatUpdate;
                const rounds = update.allRounds || [update];

                rounds.forEach(round => {
                    const details = round.details;
                    if (!details) return;

                    // Player Damage Visuals
                    if (details.playerDmg > 0) {
                        setIsMobHit(true);
                        setTimeout(() => setIsMobHit(false), 200);

                        newLogs.push({
                            id: generateLogId(),
                            type: 'combat',
                            content: `You dealt ${details.playerDmg} damage.`,
                            color: '#4a90e2'
                        });
                    }

                    // Mob Damage Visuals
                    if (details.mobDmg > 0) {
                        setIsPlayerHit(true);
                        setTimeout(() => setIsPlayerHit(false), 200);

                        newLogs.push({
                            id: generateLogId(),
                            type: 'combat',
                            content: `${details?.mobName || 'Enemy'} dealt ${details.mobDmg} damage.`,
                            color: '#ff4444'
                        });
                    }

                    if (details.silverGained > 0) {
                        newLogs.push({
                            id: generateLogId(),
                            type: 'reward',
                            content: `+${details.silverGained} Silver collected!`,
                            color: '#d4af37'
                        });
                    }

                    if (details.lootGained?.length > 0) {
                        setSessionLoot(prev => {
                            const newLoot = { ...prev };
                            details.lootGained.forEach(item => {
                                newLoot[item] = (newLoot[item] || 0) + 1;
                            });
                            return newLoot;
                        });
                        details.lootGained.forEach(item => {
                            const itemData = resolveItem(item);
                            newLogs.push({
                                id: generateLogId(),
                                type: 'loot',
                                content: `Item found: ${itemData?.name || item}!`,
                                color: '#ae00ff'
                            });
                        });
                    }

                    if (details.victory) {
                        newLogs.push({
                            id: generateLogId(),
                            type: 'victory',
                            content: `Victory! ${details?.mobName || 'Enemy'} defeated.`,
                            color: '#4caf50'
                        });
                    }

                    if (details.defeat) {
                        newLogs.push({
                            id: generateLogId(),
                            type: 'defeat',
                            content: `You were defeated! Returning to town...`,
                            color: '#ff4444'
                        });
                    }
                });
            }

            if (newLogs.length > 0) {
                setBattleLogs(prev => {
                    const updated = [...prev, ...newLogs];
                    if (updated.length > 30) {
                        return updated.slice(updated.length - 30);
                    }
                    return updated;
                });
            }
        };

        socket.on('action_result', handleActionResult);
        return () => socket.off('action_result', handleActionResult);
    }, [socket]);

    // Auto-scroll logs (só se estiver perto do fundo)
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (container) {
            const isNearBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 100;
            if (isNearBottom) {
                container.scrollTo({
                    top: container.scrollHeight,
                    behavior: 'smooth'
                });
                setShowScrollButton(false);
            } else {
                setShowScrollButton(true);
            }
        }
    }, [battleLogs]);

    // Timer para o cronômetro de interface (200ms para fluidez)
    useEffect(() => {
        if (!combat) return;

        const timer = setInterval(() => {
            setCurrentTime(Date.now());
        }, 200);

        return () => clearInterval(timer);
    }, [!!combat]);

    const scrollToBottom = () => {
        const container = scrollContainerRef.current;
        if (container) {
            container.scrollTo({
                top: container.scrollHeight,
                behavior: 'smooth'
            });
            setShowScrollButton(false);
        }
    };

    const handleFight = (mob) => {
        socket.emit('start_combat', { tier: mob.tier, mobId: mob.id });
    };

    const handleStopCombat = () => {
        socket.emit('stop_combat');
        // Limpar persistência ao parar manualmente
        if (gameState?.name) {
            localStorage.removeItem(`combat_${gameState.name}`);
        }
    };

    // Active Combat View
    if (combat) {
        // Preferencialmente usar o startTime do servidor para consistência absoluta
        const actualStartTime = combat.started_at ? new Date(combat.started_at).getTime() : Date.now();
        const duration = Math.max(1, Math.floor((currentTime - actualStartTime) / 1000));

        // Use Server Stats
        const totalDmgDealt = combat.totalPlayerDmg || 0;
        const xpGained = combat.sessionXp || 0;
        const silverGained = combat.sessionSilver || 0;
        const kills = combat.kills || 0;

        const dps = totalDmgDealt / duration;
        const xph = (xpGained / duration) * 3600;

        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: isMobile ? '8px' : '10px', padding: isMobile ? '8px' : '10px', overflowY: 'hidden' }}>
                {/* Battle Header */}
                <div className="glass-panel" style={{
                    padding: '8px 15px',
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    justifyContent: 'space-between',
                    alignItems: isMobile ? 'flex-start' : 'center',
                    background: 'rgba(255, 68, 68, 0.08)',
                    border: '1px solid rgba(255, 68, 68, 0.2)',
                    borderRadius: '8px',
                    flexShrink: 0,
                    gap: isMobile ? '10px' : '0'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ background: '#ff4444', padding: '6px', borderRadius: '6px', display: 'flex' }}>
                            <Sword color="#fff" size={16} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.55rem', color: '#ff4444', fontWeight: '900', letterSpacing: '1px' }}>IN COMBAT</div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>T{combat.tier}: {combat.mobName}</div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: isMobile ? '10px' : '20px', alignItems: 'center', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'space-between' : 'flex-end' }}>
                        {/* Survival Estimator */}
                        <div style={{ textAlign: isMobile ? 'left' : 'right' }}>
                            <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '1px' }}>SURVIVAL</div>
                            {(() => {
                                const activeMob = (MONSTERS[combat.tier] || []).find(m => m.id === combat.mobId);
                                if (!activeMob) return <span style={{ fontSize: '1rem', fontWeight: 'bold', fontFamily: 'monospace', color: '#888' }}>-</span>;

                                const defense = gameState?.calculatedStats?.defense || 0;
                                const mitigation = defense / (defense + 2000);
                                const mobDmg = Math.max(1, Math.floor(activeMob.damage * (1 - mitigation)));

                                // Food Logic
                                const food = gameState?.state?.equipment?.food;
                                const foodTotalHeal = (food && food.amount > 0) ? (food.amount * (food.heal || 0)) : 0;

                                const playerHp = combat.playerHealth || 1;
                                const totalEffectiveHp = playerHp + foodTotalHeal;
                                const atkSpeed = gameState?.calculatedStats?.attackSpeed || 1000;

                                let survivalText = "∞";
                                let survivalColor = "#4caf50";

                                if (mobDmg > 0) {
                                    const roundsToDie = totalEffectiveHp / mobDmg;

                                    // Interpolation Logic:
                                    // Time = (Time until next hit) + (Remaining hits * Interval)
                                    // roundsToDie is roughly (1 + remaining)
                                    // So we take (roundsToDie - 1) * Interval + (nextAttack - now)
                                    // roundsToDie calculation for display:
                                    let secondsToDie = 0;
                                    const nextAttack = combat.next_attack_at ? new Date(combat.next_attack_at).getTime() : Date.now();
                                    const timeToNext = Math.max(0, nextAttack - currentTime);

                                    if (roundsToDie <= 1) {
                                        secondsToDie = timeToNext / 1000;
                                    } else {
                                        secondsToDie = (timeToNext + ((roundsToDie - 1) * atkSpeed)) / 1000;
                                    }

                                    // Threshold: 12 Hours
                                    if (secondsToDie > 43200) {
                                        survivalText = "∞";
                                        survivalColor = "#4caf50";
                                    } else {
                                        const hrs = Math.floor(secondsToDie / 3600);
                                        const mins = Math.floor((secondsToDie % 3600) / 60);
                                        const secs = Math.floor(secondsToDie % 60);

                                        if (hrs > 0) {
                                            survivalText = `${hrs}h ${mins}m ${secs}s`;
                                            survivalColor = "#ff9800";
                                        } else if (mins > 0) {
                                            survivalText = `${mins}m ${secs}s`;
                                            survivalColor = "#ff9800";
                                        } else {
                                            survivalText = `${secs}s`;
                                            survivalColor = "#ff4444";
                                        }
                                    }
                                }

                                return (
                                    <div style={{ fontSize: '1rem', fontWeight: 'bold', fontFamily: 'monospace', color: survivalColor }}>
                                        {survivalText}
                                    </div>
                                );
                            })()}
                        </div>

                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '1px' }}>DURATION</div>
                            <div style={{ fontSize: '1rem', fontWeight: 'bold', fontFamily: 'monospace', color: '#fff' }}>
                                {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Battle Area */}
                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '20px', flex: isMobile ? 'none' : 1, minHeight: 0 }}>
                    {/* Visual Arena */}
                    <div className="glass-panel" style={{ flex: isMobile ? 'none' : 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', minHeight: isMobile ? '180px' : '150px' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(circle at center, rgba(255, 68, 68, 0.1) 0%, transparent 70%)', zIndex: 0 }} />

                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-around', zIndex: 1, padding: isMobile ? '10px' : '15px' }}>
                            {/* Player Side */}
                            <div style={{ textAlign: 'center', position: 'relative' }}>
                                <motion.div
                                    style={{
                                        width: isMobile ? '50px' : '100px', height: isMobile ? '50px' : '100px',
                                        background: 'linear-gradient(135deg, #d4af37 0%, #8a6d0a 100%)',
                                        borderRadius: '50%', border: isMobile ? '2px solid #fff' : '4px solid #fff',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: '0 0 20px rgba(212, 175, 55, 0.4)',
                                        marginBottom: '10px',
                                        position: 'relative',
                                        zIndex: 2
                                    }}>
                                    <User size={isMobile ? 25 : 50} color="#000" />
                                    {/* Food Badge */}
                                    {gameState?.state?.equipment?.food?.amount > 0 && (
                                        <div style={{
                                            position: 'absolute',
                                            top: -5,
                                            right: -5,
                                            background: '#ff4d4d',
                                            color: '#fff',
                                            fontSize: '0.6rem',
                                            fontWeight: '900',
                                            padding: '2px 6px',
                                            borderRadius: '10px',
                                            border: '1px solid #fff',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                                            zIndex: 2,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '2px'
                                        }}>
                                            <Apple size={10} /> {gameState.state.equipment.food.amount}
                                        </div>
                                    )}
                                </motion.div>
                                <div style={{ fontSize: isMobile ? '0.6rem' : '0.9rem', fontWeight: '900', color: '#fff' }}>{gameState?.name?.toUpperCase()}</div>
                                <div style={{ fontSize: isMobile ? '0.9rem' : '1.3rem', fontWeight: '900', color: '#4caf50', marginTop: '2px' }}>{Math.round(combat.playerHealth)} HP</div>
                            </div>

                            <div style={{ fontSize: isMobile ? '1rem' : '1.5rem', fontWeight: '900', color: 'rgba(255,255,255,0.1)' }}>VS</div>

                            {/* Mob Side */}
                            <div style={{ textAlign: 'center', position: 'relative' }}>
                                <motion.div
                                    style={{
                                        width: isMobile ? '50px' : '100px', height: isMobile ? '50px' : '100px',
                                        background: 'rgba(20, 20, 25, 0.8)',
                                        borderRadius: '50%', border: isMobile ? '2px solid #ff4444' : '4px solid #ff4444',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: '0 0 20px rgba(255, 68, 68, 0.4)',
                                        marginBottom: '10px',
                                        position: 'relative',
                                        zIndex: 2
                                    }}>
                                    <Skull size={isMobile ? 25 : 50} color="#ff4444" />
                                </motion.div>
                                <div style={{ fontSize: isMobile ? '0.6rem' : '0.9rem', fontWeight: '900', color: '#fff' }}>{combat.mobName.toUpperCase()}</div>
                                <div style={{ fontSize: isMobile ? '0.9rem' : '1.3rem', fontWeight: '900', color: '#ff4444', marginTop: '2px' }}>{Math.round(combat.mobHealth)} HP</div>
                            </div>


                        </div>

                        {/* Health Bars Overlay */}
                        <div style={{ padding: '15px', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                                <div style={{ flex: 1, minWidth: '120px' }}>
                                    <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', marginBottom: '3px' }}>CHARACTER HEALTH</div>
                                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{ width: `${(combat.playerHealth / stats.hp) * 100}%`, height: '100%', background: '#4caf50', transition: 'width 0.3s' }} />
                                    </div>
                                </div>
                                <div style={{ flex: 1, minWidth: '120px' }}>
                                    <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', textAlign: isMobile ? 'left' : 'right', marginBottom: '3px' }}>MONSTER HEALTH</div>
                                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{ width: `${(combat.mobHealth / combat.mobMaxHealth) * 100}%`, height: '100%', background: '#ff4444', transition: 'width 0.3s' }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Combat Console & Stats */}
                    <div style={{ flex: isMobile ? 'none' : 1.5, display: 'flex', flexDirection: 'column', gap: '8px', minHeight: 0, overflow: 'hidden' }}>
                        {/* Stats Dashboard */}
                        <div className="glass-panel" style={{
                            padding: '8px',
                            display: 'grid',
                            gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(2, 1fr)',
                            gap: '5px',
                            flexShrink: 0
                        }}>
                            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)' }}>
                                <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Activity size={10} /> DPS
                                </div>
                                <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#4a90e2' }}>{dps.toFixed(1)}</div>
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)' }}>
                                <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Trophy size={10} /> KILLS
                                </div>
                                <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#4caf50' }}>{kills}</div>
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)' }}>
                                <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <TrendingUp size={10} /> DAMAGE
                                </div>
                                <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#fff' }}>{formatNumber(totalDmgDealt)}</div>
                            </div>
                            <div style={{ background: 'rgba(212, 175, 55, 0.1)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
                                <div style={{ fontSize: '0.55rem', color: '#d4af37', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Coins size={10} /> SILVER
                                </div>
                                <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#d4af37' }}>{formatNumber(silverGained)}</div>
                            </div>
                            <div style={{ background: 'rgba(76, 175, 80, 0.1)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(76, 175, 80, 0.2)' }}>
                                <div style={{ fontSize: '0.55rem', color: '#4caf50', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Star size={10} /> TOTAL XP
                                </div>
                                <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#fff' }}>{formatNumber(xpGained)}</div>
                            </div>
                            <div style={{ background: 'rgba(76, 175, 80, 0.1)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(76, 175, 80, 0.2)' }}>
                                <div style={{ fontSize: '0.55rem', color: '#4caf50', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Activity size={10} /> XP/H
                                </div>
                                <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#4caf50' }}>{formatNumber(Math.floor(xph))}</div>
                            </div>
                        </div>

                        {/* Session Loot */}
                        <div className="glass-panel" style={{ padding: '8px', background: 'rgba(174, 0, 255, 0.05)', border: '1px solid rgba(174, 0, 255, 0.2)', flexShrink: 0 }}>
                            <div style={{ fontSize: '0.65rem', fontWeight: '900', color: '#ae00ff', letterSpacing: '1px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Zap size={12} /> SESSION LOOT_
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {Object.entries(sessionLoot).length === 0 ? (
                                    <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>Waiting for drops...</span>
                                ) : (
                                    Object.entries(sessionLoot).map(([id, qty]) => {
                                        const itemData = resolveItem(id);
                                        return (
                                            <div key={id} style={{
                                                background: 'rgba(0,0,0,0.3)',
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                border: '1px solid rgba(174, 0, 255, 0.2)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '5px'
                                            }}>
                                                <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#fff' }}>{qty}x</span>
                                                <span style={{ fontSize: '0.7rem', color: '#ae00ff', textTransform: 'capitalize' }}>{itemData?.name || id.replace(/_/g, ' ')}</span>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Battle Console */}
                        <div className="glass-panel" style={{
                            flex: 'none',
                            display: 'flex',
                            flexDirection: 'column',
                            overflowY: 'hidden',
                            background: '#0a0a0f',
                            border: '1px solid rgba(212, 175, 55, 0.2)',
                            flex: 1,
                            minHeight: isMobile ? '150px' : '200px',
                            maxHeight: isMobile ? '300px' : '500px',
                            position: 'relative'
                        }}>
                            <div style={{ padding: '6px 12px', background: 'rgba(212, 175, 55, 0.1)', borderBottom: '1px solid rgba(212, 175, 55, 0.2)', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                <Terminal size={10} color="#d4af37" />
                                <span style={{ fontSize: '0.55rem', fontWeight: '900', color: '#d4af37', letterSpacing: '1px' }}>LOG_</span>
                            </div>
                            <div
                                className="scroll-container"
                                ref={scrollContainerRef}
                                style={{ flex: 1, height: '100%', padding: '10px', fontFamily: 'monospace', fontSize: isMobile ? '0.7rem' : '0.85rem', color: '#ccc', overflowY: 'scroll' }}
                            >
                                {battleLogs.map(log => (
                                    <div key={log.id} style={{ marginBottom: '3px', borderLeft: `2px solid ${log.color || '#333'}`, paddingLeft: '6px' }}>
                                        <span style={{ color: log.color || '#fff', opacity: 0.5 }}>[{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span> {log.content}
                                    </div>
                                ))}
                                <div ref={logsEndRef} />
                            </div>

                            {/* Scroll to Bottom Button */}
                            {showScrollButton && (
                                <button
                                    onClick={scrollToBottom}
                                    style={{
                                        position: 'absolute',
                                        bottom: '10px',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        background: '#d4af37',
                                        color: '#000',
                                        border: 'none',
                                        padding: '4px 10px',
                                        borderRadius: '20px',
                                        fontSize: '0.55rem',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
                                        zIndex: 10,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '5px'
                                    }}
                                >
                                    <Clock size={10} /> NEW MESSAGES ↓
                                </button>
                            )}
                        </div>

                        {/* Flee Button */}
                        <button
                            onClick={handleStopCombat}
                            style={{
                                width: '100%',
                                padding: isMobile ? '12px' : '15px',
                                background: 'rgba(255, 68, 68, 0.1)',
                                border: '1px solid #ff4444',
                                color: '#ff4444',
                                borderRadius: '8px',
                                fontWeight: '900',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                letterSpacing: '2px',
                                transition: '0.2s',
                                flexShrink: 0
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 68, 68, 0.2)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 68, 68, 0.1)'; }}
                        >
                            FLEE FROM BATTLE
                        </button>
                    </div>
                </div >
            </div >
        );
    }


    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
            {/* Header / Filter */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Sword size={18} color="#ff4444" />
                        <h2 style={{ margin: 0, color: '#fff', fontSize: '0.9rem', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase' }}>Hunting Grounds</h2>
                    </div>
                    <button onClick={onShowHistory} style={{ background: 'none', border: '1px solid var(--border)', padding: '3px 8px', borderRadius: '4px', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} /> History
                    </button>
                </div>

                {/* Tier Selector - Compact Horizontal */}
                <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(tier => (
                        <button key={tier}
                            onClick={() => setActiveTier(tier)}
                            style={{
                                padding: '4px 12px',
                                flexShrink: 0,
                                background: activeTier === tier ? 'rgba(255, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                                border: `1px solid ${activeTier === tier ? '#ff4444' : 'rgba(255, 255, 255, 0.05)'}`,
                                borderRadius: '4px',
                                color: activeTier === tier ? '#ff4444' : '#555',
                                fontSize: '0.7rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: '0.2s'
                            }}>
                            T{tier}
                        </button>
                    ))}
                </div>
            </div>

            {/* Mobs List */}
            <div className="glass-panel scroll-container" style={{ flex: 1, padding: isMobile ? '5px' : '15px', background: 'rgba(10, 10, 15, 0.4)', overflowY: 'auto', overflowX: 'hidden' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '6px' : '8px', paddingBottom: '40px' }}>
                    {(MONSTERS[activeTier] || []).filter(m => !m.id.startsWith('BOSS_') && !m.dungeonOnly).map(mob => {
                        const playerDmg = stats.damage;

                        // 1. Calculate Mitigation
                        const mobDef = mob.defense || 0;
                        const mobMitigation = mobDef / (mobDef + 2000);
                        const mitigatedDmg = Math.max(1, Math.floor(playerDmg * (1 - mobMitigation)));

                        // 2. Calculate Time per Cycle
                        const roundsToKill = Math.ceil(mob.health / mitigatedDmg);
                        const interval = stats.attackSpeed / 1000;
                        const killTime = roundsToKill * interval;
                        const cycleTime = killTime + 1.0; // +1s Respawn Delay

                        const killsPerHour = 3600 / cycleTime;

                        // 3. Rewards Calculations
                        const xpBonus = stats.globals?.xpYield || 0;
                        const silverBonus = stats.globals?.silverYield || 0;

                        const xpPerKill = Math.floor(mob.xp * (1 + xpBonus / 100));
                        const xpHour = killsPerHour * xpPerKill;

                        const avgSilver = (mob.silver[0] + mob.silver[1]) / 2;
                        const silverPerKill = Math.floor(avgSilver * (1 + silverBonus / 100));
                        const silverHour = killsPerHour * silverPerKill;

                        const isLocked = ((activeTier === 1 ? 1 : (activeTier - 1) * 10) > (gameState?.state?.skills?.COMBAT?.level || 1));

                        return (
                            <div key={mob.id} style={{
                                display: 'flex',
                                flexDirection: 'row',
                                flexWrap: isMobile ? 'wrap' : 'nowrap', // Wrap on mobile
                                background: isLocked ? 'rgba(20, 20, 25, 0.4)' : 'rgba(255, 255, 255, 0.02)',
                                border: `1px solid ${isLocked ? 'rgba(255,255,255,0.03)' : 'rgba(255, 255, 255, 0.05)'}`,
                                borderRadius: '8px',
                                padding: isMobile ? '8px' : '12px 16px', // Less padding mobile
                                gap: isMobile ? '8px' : '15px',
                                alignItems: 'center',
                                transition: '0.2s',
                                opacity: isLocked ? 0.6 : 1,
                                position: 'relative',
                                borderLeft: `3px solid ${isLocked ? '#444' : '#ff4444'}`
                            }}>
                                {/* Mob Basic Info */}
                                <div style={{ flex: isMobile ? '1 1 auto' : '1.2', display: 'flex', gap: '8px', alignItems: 'center', minWidth: isMobile ? '50%' : 'auto' }}>
                                    <div style={{
                                        width: isMobile ? '32px' : '40px', height: isMobile ? '32px' : '40px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0
                                    }}>
                                        <Skull size={isMobile ? 16 : 20} color={isLocked ? '#555' : '#ff4444'} />
                                    </div>
                                    <div>
                                        <div style={{ color: '#fff', fontWeight: 'bold', fontSize: isMobile ? '0.85rem' : '1rem' }}>{mob.name}</div>
                                        <div style={{ color: 'var(--text-dim)', fontSize: isMobile ? '0.6rem' : '0.7rem', display: 'flex', gap: '6px' }}>
                                            <span style={{ color: '#ff4444' }}>HP:{mob.health}</span>
                                            <span style={{ color: '#ff9800' }}>D:{mob.damage}</span>
                                            <span style={{ color: '#4caf50' }}>XP:{mob.xp}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Button (Mobile: Right align on first row) */}
                                <div style={{ flex: isMobile ? '0 0 auto' : '0.8', display: 'flex', justifyContent: 'flex-end', order: isMobile ? 2 : 10 }}>
                                    <button
                                        onClick={() => !isLocked && handleFight(mob)}
                                        disabled={isLocked}
                                        style={{
                                            padding: isMobile ? '6px 12px' : '8px 16px',
                                            background: isLocked ? '#222' : 'rgba(255, 68, 68, 0.1)',
                                            border: isLocked ? '1px solid #333' : '1px solid #ff4444',
                                            color: isLocked ? '#555' : '#ff4444',
                                            borderRadius: '6px',
                                            fontSize: '0.7rem',
                                            fontWeight: 'bold',
                                            cursor: isLocked ? 'not-allowed' : 'pointer',
                                            transition: '0.2s',
                                        }}
                                    >
                                        {isLocked ? 'LCK' : 'FIGHT'}
                                    </button>
                                </div>

                                {/* Efficiency Stats (Mobile: New Line, Full Width) */}
                                <div style={{
                                    flex: isMobile ? '1 1 100%' : '2',
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(3, 1fr)',
                                    gap: '5px',
                                    borderLeft: isMobile ? 'none' : '1px solid rgba(255,255,255,0.05)',
                                    borderRight: isMobile ? 'none' : '1px solid rgba(255,255,255,0.05)',
                                    padding: isMobile ? '6px 0' : '0 15px',
                                    order: 3,
                                    borderTop: isMobile ? '1px solid rgba(255,255,255,0.03)' : 'none',
                                    marginTop: isMobile ? '4px' : '0'
                                }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.55rem', color: '#888' }}>XP/H</div>
                                        <div style={{ fontSize: isMobile ? '0.75rem' : '0.85rem', fontWeight: 'bold', color: '#4caf50' }}>
                                            {isMobile && xpHour > 1000 ? `${(xpHour / 1000).toFixed(1)}k` : formatNumber(xpHour)}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.55rem', color: '#888' }}>SILVER/H</div>
                                        <div style={{ fontSize: isMobile ? '0.75rem' : '0.85rem', fontWeight: 'bold', color: '#d4af37' }}>
                                            {isMobile && silverHour > 1000 ? `${(silverHour / 1000).toFixed(1)}k` : formatNumber(silverHour)}
                                        </div>
                                    </div>

                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.55rem', color: '#888' }}>SURVIVAL</div>
                                        {(() => {
                                            const defense = gameState?.calculatedStats?.defense || 0;
                                            const mitigation = Math.min(0.60, defense / (defense + 2000));
                                            const mobDmg = Math.max(1, Math.floor(mob.damage * (1 - mitigation)));

                                            // Food Logic
                                            const food = gameState?.state?.equipment?.food;
                                            const foodTotalHeal = (food && food.amount > 0) ? (food.amount * (food.heal || 0)) : 0;

                                            const playerHp = gameState?.state?.health || 1;
                                            const totalEffectiveHp = playerHp + foodTotalHeal;
                                            const atkSpeed = gameState?.calculatedStats?.attackSpeed || 1000;

                                            let survivalText = "∞";
                                            let survivalColor = "#4caf50";

                                            if (mobDmg > 0) {
                                                const roundsToDie = totalEffectiveHp / mobDmg;
                                                const secondsToDie = roundsToDie * (atkSpeed / 1000);

                                                if (secondsToDie > 43200) {
                                                    survivalText = "∞";
                                                } else {
                                                    const hrs = Math.floor(secondsToDie / 3600);
                                                    const mins = Math.floor((secondsToDie % 3600) / 60);
                                                    if (hrs > 0) survivalText = `${hrs}h${mins}m`;
                                                    else survivalText = `${mins}m`;
                                                    survivalColor = "#ff9800";
                                                    if (hrs === 0 && mins === 0) {
                                                        survivalText = `${Math.floor(secondsToDie % 60)}s`;
                                                        survivalColor = "#ff4444";
                                                    }
                                                }
                                            }

                                            return (
                                                <div style={{ fontSize: isMobile ? '0.75rem' : '0.85rem', fontWeight: 'bold', color: survivalColor }}>
                                                    {survivalText}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>

                                {/* Drops (Compact) */}
                                <div style={{ flex: isMobile ? '1 1 100%' : '1.5', display: 'flex', flexWrap: 'wrap', gap: '4px', order: 4 }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(212, 175, 55, 0.1)', padding: '2px 6px', borderRadius: '4px', color: '#d4af37', fontSize: '0.65rem' }}>
                                        <Coins size={10} /> {isMobile ? `${mob.silver[0]}-${mob.silver[1]}` : `${mob.silver[0]}-${mob.silver[1]} Silver`}
                                    </span>
                                    {Object.entries(mob.loot).map(([id, chance]) => (
                                        <span key={id} style={{
                                            background: chance <= 0.05 ? 'rgba(174, 0, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                                            padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', color: chance <= 0.05 ? '#ae00ff' : '#aaa',
                                            border: '1px solid rgba(255,255,255,0.03)'
                                        }}>
                                            {id.replace(/_/g, ' ')} <span style={{ opacity: 0.7, fontSize: '0.6rem', marginLeft: '3px' }}>{(chance * 100).toFixed(1).replace('.0', '')}%</span>
                                        </span>
                                    ))}
                                </div>

                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default CombatPanel;
