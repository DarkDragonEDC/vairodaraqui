import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Sword, Shield, Skull, Coins, Zap, Clock, Trophy, ChevronRight, User, Terminal, Activity, TrendingUp, Star, Apple } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MONSTERS } from '@shared/monsters';

const CombatPanel = ({ socket, gameState, isMobile, onShowHistory }) => {
    const [activeTier, setActiveTier] = useState(1);
    const [battleLogs, setBattleLogs] = useState([]);
    const [sessionLoot, setSessionLoot] = useState({});
    const [battleStats, setBattleStats] = useState({
        totalDmgDealt: 0,
        totalDmgTaken: 0,
        silverGained: 0,
        xpGained: 0,
        kills: 0,
        startTime: Date.now()
    });
    const logsEndRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const prevCombatRef = useRef(null);
    const [isRestored, setIsRestored] = useState(false);
    const [currentTime, setCurrentTime] = useState(Date.now());
    const [isPlayerHit, setIsPlayerHit] = useState(false);
    const [isMobHit, setIsMobHit] = useState(false);
    const [floatingTexts, setFloatingTexts] = useState([]);

    const spawnFloatingText = (content, type, x, y) => {
        const id = Date.now() + Math.random();
        setFloatingTexts(prev => [...prev, { id, content, type, x, y }]);
        setTimeout(() => {
            setFloatingTexts(prev => prev.filter(t => t.id !== id));
        }, 1000);
    };

    // Cálculo de Stats (Replicado do ProfilePanel para consistência)
    const stats = useMemo(() => {
        if (!gameState?.state?.skills) return { str: 0, agi: 0, int: 0, hp: 100, damage: 5 };
        const skills = gameState.state.skills;

        let str = 0;
        let agi = 0;
        let int = 0;

        const getLvl = (key) => (skills[key]?.level || 1);

        str += getLvl('ORE_MINER');
        str += getLvl('METAL_BAR_REFINER');
        str += getLvl('WARRIOR_CRAFTER');

        agi += getLvl('ANIMAL_SKINNER');
        agi += getLvl('LEATHER_REFINER');
        agi += getLvl('HUNTER_CRAFTER');

        int += getLvl('FIBER_HARVESTER');
        int += getLvl('LUMBERJACK');
        int += getLvl('CLOTH_REFINER');
        int += getLvl('PLANK_REFINER');
        int += getLvl('MAGE_CRAFTER');
        int += getLvl('COOKING');
        int += getLvl('FISHING');

        return {
            str, agi, int,
            hp: 100 + (str * 10),
            damage: 5 + (str * 1)
        };
    }, [gameState]);

    const combat = gameState?.state?.combat;

    // Reset ou Restauração de stats quando o combate muda/inicia
    useEffect(() => {
        if (!combat || !gameState?.name) return;

        const storageKey = `combat_${gameState.name}`;
        const saved = localStorage.getItem(storageKey);

        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Se o monstro é o mesmo, recuperamos a sessão do localStorage
                if (parsed.mobId === combat.mobId) {
                    setBattleStats(parsed.stats);
                    setSessionLoot(parsed.loot);
                    setBattleLogs(parsed.logs || []);
                    setIsRestored(true);
                    return;
                }
            } catch (e) {
                console.error("Erro ao carregar sessão de combate:", e);
            }
        }

        // Se chegamos aqui, é um combate novo ou monstro diferente: Reset total
        setSessionLoot({});
        setBattleStats({
            totalDmgDealt: 0,
            totalDmgTaken: 0,
            silverGained: 0,
            xpGained: 0,
            kills: 0,
            startTime: Date.now()
        });
        setBattleLogs([{ id: 'start', type: 'info', content: `Starting combat against ${combat.mobName}...` }]);
        setIsRestored(true);
    }, [combat?.mobId, gameState?.name]);

    // Salvar progresso no localStorage sempre que mudar (APENAS APÓS RESTAURAÇÃO)
    useEffect(() => {
        if (!combat || !gameState?.name || !isRestored) return;

        const storageKey = `combat_${gameState.name}`;
        const data = {
            mobId: combat.mobId,
            stats: battleStats,
            loot: sessionLoot,
            logs: battleLogs
        };
        localStorage.setItem(storageKey, JSON.stringify(data));
    }, [battleStats, sessionLoot, battleLogs, combat?.mobId, gameState?.name, isRestored]);

    // Limpar storage quando o combate acaba explicitamente (não apenas no mount)
    useEffect(() => {
        // Se tínhamos combate e agora não temos (e o gameState está carregado), então acabou
        if (prevCombatRef.current && !combat && gameState?.name) {
            localStorage.removeItem(`combat_${gameState.name}`);
            setIsRestored(false);
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
            if (result.combatUpdate) {
                const update = result.combatUpdate;
                const details = update.details;

                if (details) {
                    if (details.playerDmg > 0) {
                        setIsMobHit(true);
                        setTimeout(() => setIsMobHit(false), 200);
                        spawnFloatingText(`-${details.playerDmg}`, 'damage-deal', 75, 50);
                    }
                    if (details.mobDmg > 0) {
                        setIsPlayerHit(true);
                        setTimeout(() => setIsPlayerHit(false), 200);
                        spawnFloatingText(`-${details.mobDmg}`, 'damage-take', 25, 50);
                    }

                    setBattleStats(prev => ({
                        ...prev,
                        totalDmgDealt: prev.totalDmgDealt + details.playerDmg,
                        totalDmgTaken: prev.totalDmgTaken + details.mobDmg,
                        silverGained: prev.silverGained + (details.silverGained || 0),
                        xpGained: prev.xpGained + (details.xpGained || 0),
                        kills: prev.kills + (details.victory ? 1 : 0)
                    }));

                    const newLogs = [];
                    newLogs.push({
                        id: generateLogId(),
                        type: 'combat',
                        content: `You dealt ${details.playerDmg} damage.`,
                        color: '#4a90e2'
                    });
                    newLogs.push({
                        id: generateLogId(),
                        type: 'combat',
                        content: `${update.details?.mobName || 'Enemy'} dealt ${details.mobDmg} damage.`,
                        color: '#ff4444'
                    });

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
                            newLogs.push({
                                id: generateLogId(),
                                type: 'loot',
                                content: `Item found: ${item}!`,
                                color: '#ae00ff'
                            });
                        });
                    }

                    if (details.victory) {
                        newLogs.push({
                            id: generateLogId(),
                            type: 'victory',
                            content: `Victory! ${update.details?.mobName || 'Enemy'} defeated.`,
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

                    setBattleLogs(prev => [...prev, ...newLogs].slice(-50));
                }
            }
        };

        socket.on('action_result', handleActionResult);
        return () => socket.off('action_result', handleActionResult);
    }, [socket, combat?.mobName]);

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

    // Timer de 1s para o cronômetro de interface ser "em tempo real"
    useEffect(() => {
        if (!combat) return;

        const timer = setInterval(() => {
            setCurrentTime(Date.now());
        }, 1000);

        return () => clearInterval(timer);
    }, [combat]);

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
        const actualStartTime = combat.started_at ? new Date(combat.started_at).getTime() : battleStats.startTime;
        const duration = Math.floor((currentTime - actualStartTime) / 1000);
        const dps = battleStats.totalDmgDealt / (duration || 1);
        const xph = (battleStats.xpGained / (duration || 1)) * 3600;

        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: isMobile ? '8px' : '10px', padding: isMobile ? '8px' : '10px', overflowY: 'auto' }}>
                {/* Battle Header */}
                <div className="glass-panel" style={{
                    padding: '8px 15px',
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(255, 68, 68, 0.08)',
                    border: '1px solid rgba(255, 68, 68, 0.2)',
                    borderRadius: '8px'
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
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '1px' }}>DURATION</div>
                        <div style={{ fontSize: '1rem', fontWeight: 'bold', fontFamily: 'monospace', color: '#fff' }}>
                            {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
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

                            {/* Floating Texts Container */}
                            <AnimatePresence>
                                {floatingTexts.map(text => (
                                    <motion.div
                                        key={text.id}
                                        initial={{ opacity: 1, y: 0, scale: 0.5 }}
                                        animate={{ opacity: 0, y: -100, scale: 1.5 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.8 }}
                                        style={{
                                            position: 'absolute',
                                            left: `${text.x}%`,
                                            top: `${text.y}%`,
                                            transform: 'translate(-50%, -50%)',
                                            color: text.type === 'damage-take' ? '#ff4d4d' : '#4a90e2',
                                            fontWeight: 'bold',
                                            fontSize: '1.5rem',
                                            textShadow: '0 0 10px rgba(0,0,0,0.8)',
                                            pointerEvents: 'none',
                                            zIndex: 10
                                        }}
                                    >
                                        {text.content}
                                    </motion.div>
                                ))}
                            </AnimatePresence>
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
                    <div style={{ flex: isMobile ? 'none' : 1.5, display: 'flex', flexDirection: 'column', gap: '8px', minHeight: 'auto' }}>
                        {/* Stats Dashboard */}
                        <div className="glass-panel" style={{
                            padding: '8px',
                            display: 'grid',
                            gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(2, 1fr)',
                            gap: '5px'
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
                                <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#4caf50' }}>{battleStats.kills}</div>
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)' }}>
                                <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <TrendingUp size={10} /> DAMAGE
                                </div>
                                <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#fff' }}>{battleStats.totalDmgDealt.toLocaleString()}</div>
                            </div>
                            <div style={{ background: 'rgba(212, 175, 55, 0.1)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
                                <div style={{ fontSize: '0.55rem', color: '#d4af37', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Coins size={10} /> SILVER
                                </div>
                                <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#d4af37' }}>{battleStats.silverGained.toLocaleString()}</div>
                            </div>
                            <div style={{ background: 'rgba(76, 175, 80, 0.1)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(76, 175, 80, 0.2)' }}>
                                <div style={{ fontSize: '0.55rem', color: '#4caf50', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Star size={10} /> TOTAL XP
                                </div>
                                <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#fff' }}>{battleStats.xpGained.toLocaleString()}</div>
                            </div>
                            <div style={{ background: 'rgba(76, 175, 80, 0.1)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(76, 175, 80, 0.2)' }}>
                                <div style={{ fontSize: '0.55rem', color: '#4caf50', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Activity size={10} /> XP/H
                                </div>
                                <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#4caf50' }}>{Math.floor(xph).toLocaleString()}</div>
                            </div>
                        </div>

                        {/* Session Loot */}
                        <div className="glass-panel" style={{ padding: '8px', background: 'rgba(174, 0, 255, 0.05)', border: '1px solid rgba(174, 0, 255, 0.2)' }}>
                            <div style={{ fontSize: '0.65rem', fontWeight: '900', color: '#ae00ff', letterSpacing: '1px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Zap size={12} /> SESSION LOOT_
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {Object.entries(sessionLoot).length === 0 ? (
                                    <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>Waiting for drops...</span>
                                ) : (
                                    Object.entries(sessionLoot).map(([id, qty]) => (
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
                                            <span style={{ fontSize: '0.7rem', color: '#ae00ff', textTransform: 'capitalize' }}>{id.replace(/_/g, ' ')}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Battle Console */}
                        <div className="glass-panel" style={{
                            flex: 2,
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            background: '#0a0a0f',
                            border: '1px solid rgba(212, 175, 55, 0.2)',
                            minHeight: isMobile ? '120px' : '120px',
                            maxHeight: isMobile ? '200px' : 'none',
                            position: 'relative'
                        }}>
                            <div style={{ padding: '6px 12px', background: 'rgba(212, 175, 55, 0.1)', borderBottom: '1px solid rgba(212, 175, 55, 0.2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Terminal size={10} color="#d4af37" />
                                <span style={{ fontSize: '0.55rem', fontWeight: '900', color: '#d4af37', letterSpacing: '1px' }}>LOG_</span>
                            </div>
                            <div
                                className="scroll-container"
                                ref={scrollContainerRef}
                                style={{ flex: 1, padding: '10px', fontFamily: 'monospace', fontSize: isMobile ? '0.7rem' : '0.85rem', color: '#ccc', overflowY: 'auto' }}
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
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
                <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '4px', className: 'hide-scrollbar' }}>
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
            <div className="glass-panel scroll-container" style={{ flex: 1, padding: isMobile ? '10px' : '15px', background: 'rgba(10, 10, 15, 0.4)', overflowY: 'auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '40px' }}>
                    {(MONSTERS[activeTier] || []).filter(m => !m.id.startsWith('BOSS_')).map(mob => {
                        const playerDmg = stats.damage;
                        const roundsToKill = Math.ceil(mob.health / playerDmg);
                        const ttk = roundsToKill * 3;
                        const risk = roundsToKill * mob.damage;
                        const killsPerHour = Math.floor(3600 / ttk);
                        const xpHour = killsPerHour * mob.xp;
                        const avgSilver = (mob.silver[0] + mob.silver[1]) / 2;
                        const silverHour = killsPerHour * avgSilver;

                        const isLocked = ((activeTier === 1 ? 1 : (activeTier - 1) * 10) > (gameState?.state?.skills?.COMBAT?.level || 1));

                        return (
                            <div key={mob.id} style={{
                                display: 'flex',
                                flexDirection: isMobile ? 'column' : 'row',
                                background: isLocked ? 'rgba(20, 20, 25, 0.4)' : 'rgba(255, 255, 255, 0.02)',
                                border: `1px solid ${isLocked ? 'rgba(255,255,255,0.03)' : 'rgba(255, 255, 255, 0.05)'}`,
                                borderRadius: '8px',
                                padding: '12px 16px',
                                gap: '15px',
                                alignItems: isMobile ? 'stretch' : 'center',
                                transition: '0.2s',
                                opacity: isLocked ? 0.6 : 1,
                                position: 'relative',
                                borderLeft: `3px solid ${isLocked ? '#444' : '#ff4444'}`
                            }}>
                                {/* Mob Basic Info */}
                                <div style={{ flex: '1.2', display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <div style={{
                                        width: '40px', height: '40px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.1)'
                                    }}>
                                        <Skull size={20} color={isLocked ? '#555' : '#ff4444'} />
                                    </div>
                                    <div>
                                        <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '1rem' }}>{mob.name}</div>
                                        <div style={{ color: 'var(--text-dim)', fontSize: '0.7rem', display: 'flex', gap: '8px' }}>
                                            <span style={{ color: '#ff4444' }}>HP: {mob.health}</span>
                                            <span style={{ color: '#ff9800' }}>DMG: {mob.damage}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Efficiency Stats */}
                                {!isMobile && (
                                    <div style={{ flex: '2', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', borderLeft: '1px solid rgba(255,255,255,0.05)', borderRight: '1px solid rgba(255,255,255,0.05)', padding: '0 15px' }}>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.6rem', color: '#888' }}>XP/H</div>
                                            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#4caf50' }}>{xpHour.toLocaleString()}</div>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.6rem', color: '#888' }}>SILVER/H</div>
                                            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#d4af37' }}>{silverHour.toLocaleString()}</div>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.6rem', color: '#888' }}>TTK / RISK</div>
                                            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fff' }}>{ttk}s / {risk}HP</div>
                                        </div>
                                    </div>
                                )}

                                {/* Drops (Compact) */}
                                <div style={{ flex: '1.5', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(212, 175, 55, 0.1)', padding: '2px 6px', borderRadius: '4px', color: '#d4af37', fontSize: '0.7rem' }}>
                                        <Coins size={10} /> {mob.silver[0]}-{mob.silver[1]}
                                    </span>
                                    {Object.entries(mob.loot).map(([id, chance]) => (
                                        <span key={id} style={{
                                            background: chance <= 0.05 ? 'rgba(174, 0, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                                            padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', color: chance <= 0.05 ? '#ae00ff' : '#aaa',
                                            border: '1px solid rgba(255,255,255,0.03)'
                                        }}>
                                            {id.replace(/_/g, ' ')} ({Math.round(chance * 100)}%)
                                        </span>
                                    ))}
                                </div>

                                {/* Action Button */}
                                <div style={{ flex: '0.8', display: 'flex', justifyContent: 'flex-end' }}>
                                    <button
                                        onClick={() => !isLocked && handleFight(mob)}
                                        disabled={isLocked}
                                        style={{
                                            padding: '8px 16px',
                                            background: isLocked ? '#222' : 'rgba(255, 68, 68, 0.1)',
                                            border: isLocked ? '1px solid #333' : '1px solid #ff4444',
                                            color: isLocked ? '#555' : '#ff4444',
                                            borderRadius: '6px',
                                            fontSize: '0.75rem',
                                            fontWeight: 'bold',
                                            cursor: isLocked ? 'not-allowed' : 'pointer',
                                            transition: '0.2s',
                                            width: isMobile ? '100%' : 'auto'
                                        }}
                                        onMouseEnter={(e) => { if (!isLocked) e.currentTarget.style.background = 'rgba(255, 68, 68, 0.2)'; }}
                                        onMouseLeave={(e) => { if (!isLocked) e.currentTarget.style.background = 'rgba(255, 68, 68, 0.1)'; }}
                                    >
                                        {isLocked ? 'LOCKED' : 'FIGHT'}
                                    </button>
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
