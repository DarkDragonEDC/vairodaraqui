import React, { useState, useEffect } from 'react';
import { Play, CheckCircle, Clock, Square, Zap, Hammer, Pickaxe, Box, Loader, Hourglass, Sword, Skull, Heart, Apple } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { resolveItem, formatItemId } from '@shared/items';
import { MONSTERS } from '@shared/monsters';

const ActivityWidget = ({ gameState, onStop, socket, onNavigate, isMobile, serverTimeOffset = 0, skillProgress = 0 }) => { // Added skillProgress prop
    const [isOpen, setIsOpen] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [combatElapsed, setCombatElapsed] = useState(0);
    const [dungeonElapsed, setDungeonElapsed] = useState(0);
    const [syncedElapsed, setSyncedElapsed] = useState(0);

    const activity = gameState?.current_activity;
    const combat = gameState?.state?.combat;
    const dungeonState = gameState?.dungeon_state || gameState?.state?.dungeon;

    // Derived stats
    const initialQty = activity?.initial_quantity || activity?.actions_remaining || 1;
    const remainingQty = activity?.actions_remaining || 0;
    const doneQty = Math.max(0, initialQty - remainingQty);
    const timePerAction = activity?.time_per_action || 3;

    // Timer para Atividade (Legacy/Fallback)
    useEffect(() => {
        if (!activity || !gameState?.activity_started_at) return;
        const interval = setInterval(() => {
            const start = new Date(gameState?.activity_started_at).getTime();
            const now = Date.now() + serverTimeOffset;
            setElapsed((now - start) / 1000);
        }, 100);
        return () => clearInterval(interval);
    }, [activity, gameState?.activity_started_at, serverTimeOffset]);

    // Timer para Combate

    // Timer para Combate
    useEffect(() => {
        if (!combat) return;
        const startTime = combat.started_at ? new Date(combat.started_at).getTime() : Date.now();

        // Update immediately to avoid delay
        setCombatElapsed(Math.floor((Date.now() - startTime) / 1000));

        const interval = setInterval(() => {
            setCombatElapsed(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);
        return () => clearInterval(interval);
    }, [combat?.started_at, !!combat]); // Only restart if started_at changes or combat toggles

    // Timer para Dungeon
    useEffect(() => {
        if (!dungeonState || !dungeonState.active) return;
        const startTime = dungeonState.started_at ? new Date(dungeonState.started_at).getTime() : Date.now();

        setDungeonElapsed(Math.floor((Date.now() - startTime) / 1000));

        const interval = setInterval(() => {
            setDungeonElapsed(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);
        return () => clearInterval(interval);
    }, [dungeonState?.started_at, !!dungeonState]);

    // Accurate Time Calculation using next_action_at
    useEffect(() => {
        if (!activity) return;

        const updateTimer = () => {
            const now = Date.now() + serverTimeOffset;
            const initialQty = activity.initial_quantity || activity.actions_remaining || 1;
            const remainingQty = activity.actions_remaining;
            const doneQty = Math.max(0, initialQty - remainingQty);
            const timePerAction = activity.time_per_action || 3;

            let currentItemProgressMs = 0;

            if (activity.next_action_at) {
                const endTime = new Date(activity.next_action_at).getTime();
                const timeRemaining = endTime - now;

                // Invert logic: 0 remaining = full progress on this item
                // Max progress = timePerAction * 1000
                currentItemProgressMs = Math.max(0, Math.min(timePerAction * 1000, (timePerAction * 1000) - timeRemaining));
            }

            const totalMs = (doneQty * timePerAction * 1000) + currentItemProgressMs;
            setSyncedElapsed(totalMs / 1000);
        };

        const interval = setInterval(updateTimer, 50); // 20fps
        updateTimer();

        return () => clearInterval(interval);
    }, [activity, serverTimeOffset]);

    // ... keydown handler ...

    if (!activity && !combat && (!dungeonState || !dungeonState.active)) return null;

    const isGathering = activity?.type === 'GATHERING';
    const isRefining = activity?.type === 'REFINING';
    const isCrafting = activity?.type === 'CRAFTING';

    const totalDuration = initialQty * timePerAction;
    const totalProgress = Math.min(100, (syncedElapsed / totalDuration) * 100);
    const remainingSeconds = Math.max(0, totalDuration - syncedElapsed);

    // Skill Badge Progress (Capped 0-100)
    // Calculate based on the fraction of the current action completed
    const currentActionProgressPercent = activity?.next_action_at
        ? Math.max(0, Math.min(100, ((timePerAction * 1000) - (new Date(activity.next_action_at).getTime() - (Date.now() + serverTimeOffset))) / (timePerAction * 10)))
        : 0;

    const skillProgressCapped = currentActionProgressPercent;
    // Formatar Tempo (HH:MM:SS)
    const formatTime = (secs) => {
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = Math.floor(secs % 60);
        return `${h > 0 ? h + ':' : ''}${m < 10 && h > 0 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s} `;
    };

    const getActivityIcon = () => {
        if (isGathering) return <Pickaxe size={24} color="#d4af37" />;
        if (isRefining) return <Box size={24} color="#d4af37" />;
        if (isCrafting) return <Hammer size={24} color="#d4af37" />;
        return <Zap size={24} color="#d4af37" />;
    };

    const getActionName = () => {
        if (isGathering) return 'GATHERING';
        if (isRefining) return 'REFINING';
        if (isCrafting) return 'CRAFTING';
        return 'WORKING';
    };

    const stopCombat = () => {
        if (socket) socket.emit('stop_combat');
        setIsOpen(false);
    };

    return (
        <>
            {/* Botão Flutuante Pulsante */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    position: 'fixed',
                    bottom: '30px',
                    right: isMobile ? '20px' : '30px',
                    width: '64px',
                    height: '64px',
                    borderRadius: '16px',
                    background: (combat || (dungeonState?.active)) ? 'rgba(50, 10, 10, 0.95)' : 'rgba(15, 20, 30, 0.95)',
                    border: (combat || (dungeonState?.active)) ? '1px solid #ff4444' : '1px solid #d4af37',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    zIndex: 1000,
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    backdropFilter: 'blur(10px)',
                    transform: isOpen ? 'scale(0.9)' : 'scale(1)'
                }}
            >
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px' }}>
                    {(activity && combat) ? (
                        <>
                            <div style={{ position: 'absolute', top: -4, left: -4, transform: 'rotate(-10deg)' }}>
                                <Sword size={20} color="#ff4444" />
                            </div>
                            <div style={{ position: 'absolute', bottom: -4, right: -4, transform: 'rotate(10deg)' }}>
                                {React.cloneElement(getActivityIcon(), { size: 20 })}
                            </div>
                        </>
                    ) : (
                        (combat || (dungeonState?.active)) ? <Skull size={24} color="#ff4444" /> : getActivityIcon()
                    )}
                    <motion.div
                        animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.1, 1] }}
                        transition={{ repeat: Infinity, duration: (combat || (dungeonState?.active)) ? 0.8 : 2 }} // Pulsa mais rápido em combate/dungeon
                        style={{
                            position: 'absolute',
                            width: '100%',
                            height: '100%',
                            borderRadius: '50%',
                            boxShadow: (combat || (dungeonState?.active)) ? '0 0 20px rgba(255, 68, 68, 0.4)' : '0 0 15px rgba(212, 175, 55, 0.3)'
                        }}
                    />

                    {/* Badge de Atividades Ativas */}
                    {(activity && combat) && (
                        <div style={{
                            position: 'absolute',
                            bottom: -5,
                            right: -5,
                            background: '#d4af37',
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.6rem',
                            fontWeight: 'bold',
                            color: '#000',
                            border: '2px solid rgba(15, 20, 30, 1)'
                        }}>
                            2
                        </div>
                    )}
                </div>
            </button>

            {/* Container dos Cards */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        <div
                            style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 999 }}
                            onClick={() => setIsOpen(false)}
                        />
                        <div style={{
                            position: 'fixed',
                            bottom: '110px',
                            right: isMobile ? '20px' : '30px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '15px',
                            zIndex: 1001,
                            alignItems: 'flex-end' // Alinha à direita
                        }}>

                            {/* --- CARD DE ATIVIDADE (Se houver) --- */}
                            {activity && (
                                <motion.div
                                    initial={{ opacity: 0, x: 20, scale: 0.95 }}
                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                    exit={{ opacity: 0, x: 20, scale: 0.95 }}
                                    onClick={() => onNavigate && onNavigate(activity.item_id)}
                                    style={{
                                        width: '280px',
                                        maxWidth: 'calc(100vw - 60px)',
                                        background: 'rgba(15, 20, 30, 0.95)',
                                        backdropFilter: 'blur(20px)',
                                        border: '1px solid rgba(212, 175, 55, 0.2)',
                                        borderRadius: '12px',
                                        padding: '12px',
                                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                                        overflow: 'hidden',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {/* Header Activity */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{
                                                width: '32px', height: '32px', borderRadius: '8px',
                                                background: 'rgba(212, 175, 55, 0.1)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                border: '1px solid rgba(212, 175, 55, 0.2)'
                                            }}>
                                                <motion.div
                                                    animate={{ rotate: isRefining || isCrafting ? 360 : 0, y: isGathering ? [0, -2, 0] : 0 }}
                                                    transition={{ repeat: Infinity, duration: isGathering ? 0.5 : 2, ease: "linear" }}
                                                >
                                                    {React.cloneElement(getActivityIcon(), { size: 18 })}
                                                </motion.div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.55rem', color: '#888', fontWeight: '900', letterSpacing: '0.5px' }}>CURRENT ACTIVITY</div>
                                                <div style={{ fontSize: '0.8rem', color: '#d4af37', fontWeight: '900' }}>{getActionName()}</div>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '0.55rem', color: '#888', fontWeight: 'bold' }}>ELAPSED</div>
                                            <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#fff', fontWeight: 'bold' }}>
                                                {formatTime(syncedElapsed)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Info Activity */}
                                    <div style={{
                                        background: 'rgba(255,255,255,0.03)',
                                        borderRadius: '6px',
                                        padding: '8px',
                                        marginBottom: '10px',
                                        border: '1px solid rgba(255,255,255,0.05)'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                            <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.8rem' }}>
                                                {(() => {
                                                    const item = resolveItem(activity.item_id);
                                                    if (item) {
                                                        const qualityPrefix = item.qualityName && item.qualityName !== 'Normal' ? `${item.qualityName} ` : '';
                                                        return `${qualityPrefix}T${item.tier} ${item.name}`;
                                                    }

                                                    // Fallback: try to extract tier from ID (e.g. T2_FISH)
                                                    const match = activity.item_id?.match(/^T(\d+)_/);
                                                    const tierPart = match ? `T${match[1]} ` : '';
                                                    const namePart = formatItemId(activity.item_id);

                                                    return formatItemId(activity.item_id) || 'Unknown Item';
                                                })()}
                                            </span>
                                            <span style={{ color: '#d4af37', fontWeight: 'bold', fontSize: '0.8rem' }}>{doneQty} <span style={{ fontSize: '0.6rem', color: '#666' }}>/ {initialQty}</span></span>
                                        </div>

                                        {/* Barra de Progresso Total (Única Barra) */}
                                        <div style={{ height: '8px', background: 'rgba(0,0,0,0.5)', borderRadius: '4px', overflow: 'hidden', position: 'relative', marginBottom: '4px' }}>
                                            <div style={{
                                                width: `${totalProgress}%`,
                                                height: '100%',
                                                background: 'linear-gradient(90deg, #d4af37, #f2d06b)',
                                                transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                boxShadow: '0 0 10px rgba(212, 175, 55, 0.3)'
                                            }} />
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.55rem', color: '#666' }}>
                                            <span>{doneQty} completed</span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                <Hourglass size={8} /> ~{formatTime(remainingSeconds)}
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onStop) onStop(); // Use onStop prop from App.jsx
                                            setIsOpen(false);
                                        }}
                                        style={{
                                            width: '100%',
                                            background: 'rgba(212, 175, 55, 0.1)',
                                            border: '1px solid rgba(212, 175, 55, 0.3)',
                                            color: '#d4af37',
                                            padding: '8px',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontWeight: '900',
                                            fontSize: '0.7rem',
                                            letterSpacing: '1px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            transition: '0.2s'
                                        }}
                                    >
                                        <Square size={14} fill="#d4af37" />
                                        STOP
                                    </button>
                                </motion.div>
                            )}

                            {/* --- CARD DE COMBATE (Se houver) --- */}
                            {combat && (
                                <motion.div
                                    initial={{ opacity: 0, x: 20, scale: 0.95 }}
                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                    exit={{ opacity: 0, x: 20, scale: 0.95 }}
                                    onClick={() => {
                                        if (onNavigate) {
                                            onNavigate('combat');
                                            setIsOpen(false); // Close widget on navigation
                                        }
                                    }}
                                    style={{
                                        width: '280px',
                                        maxWidth: 'calc(100vw - 60px)',
                                        background: 'rgba(20, 10, 10, 0.95)',
                                        backdropFilter: 'blur(20px)',
                                        border: '1px solid rgba(255, 68, 68, 0.3)',
                                        borderRadius: '12px',
                                        padding: '12px',
                                        boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
                                        overflow: 'hidden',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {/* Header Combat */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{
                                                width: '32px', height: '32px', borderRadius: '8px',
                                                background: 'rgba(255, 68, 68, 0.1)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                border: '1px solid rgba(255, 68, 68, 0.3)',
                                                position: 'relative'
                                            }}>
                                                <motion.div
                                                    animate={{ rotate: [-10, 10, -10], scale: [1, 1.1, 1] }}
                                                    transition={{ repeat: Infinity, duration: 1 }}
                                                >
                                                    <Sword size={18} color="#ff4444" />
                                                </motion.div>
                                                {gameState?.state?.equipment?.food?.amount > 0 && (
                                                    <div style={{
                                                        position: 'absolute', top: -4, right: -4,
                                                        background: '#ff4d4d', color: '#fff', fontSize: '0.45rem',
                                                        fontWeight: '900', padding: '1px 3px', borderRadius: '3px',
                                                        border: '1px solid rgba(255,255,255,0.2)'
                                                    }}>
                                                        x{gameState.state.equipment.food.amount}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.55rem', color: '#ff8888', fontWeight: '900', letterSpacing: '0.5px', display: 'flex', gap: '8px' }}>
                                                    <span>ACTIVE COMBAT</span>
                                                    {combat.kills > 0 && <span style={{ color: '#fff' }}>• {combat.kills} KILLS</span>}
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: '#ff4444', fontWeight: '900' }}>{combat.mobName}</div>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right', display: 'flex', gap: '15px' }}>
                                            {/* Survival Estimator */}
                                            <div>
                                                <div style={{ fontSize: '0.55rem', color: '#ff8888', fontWeight: 'bold' }}>SURVIVAL</div>
                                                <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#fff', fontWeight: 'bold' }}>
                                                    {(() => {
                                                        const activeMob = (MONSTERS[combat.tier] || []).find(m => m.id === combat.mobId);
                                                        if (!activeMob) return <span>-</span>;

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

                                                            let secondsToDie = 0;

                                                            // Note: We need currentTime state for smooth interpolation in Widget
                                                            // The widget uses syncedElapsed (50ms interval) for activity, 
                                                            // but here we are in a render scope.
                                                            // We can use Date.now() if this component re-renders often.
                                                            // The Widget pulsates so it might re-render, but better to use a driving state.
                                                            // syncedElapsed is updated every 50ms, triggering re-render.
                                                            // So we can use Date.now() here safely.

                                                            const now = Date.now() + (serverTimeOffset || 0);
                                                            const nextAttack = combat.next_attack_at ? new Date(combat.next_attack_at).getTime() : now;
                                                            const timeToNext = Math.max(0, nextAttack - now);

                                                            if (roundsToDie <= 1) {
                                                                secondsToDie = timeToNext / 1000;
                                                            } else {
                                                                secondsToDie = (timeToNext + ((roundsToDie - 1) * atkSpeed)) / 1000;
                                                            }

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
                                                            <span style={{ color: survivalColor }}>
                                                                {survivalText}
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
                                            </div>

                                            <div>
                                                <div style={{ fontSize: '0.55rem', color: '#ff8888', fontWeight: 'bold' }}>DURATION</div>
                                                <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#fff', fontWeight: 'bold' }}>
                                                    {formatTime(combatElapsed)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Info Combat */}
                                    <div style={{
                                        background: 'rgba(0,0,0,0.3)',
                                        borderRadius: '6px',
                                        padding: '8px',
                                        marginBottom: '10px',
                                        border: '1px solid rgba(255, 68, 68, 0.1)'
                                    }}>
                                        {/* Barra HP Mob */}
                                        <div style={{ marginBottom: '8px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                                <span style={{ fontSize: '0.7rem', color: '#ff4444', fontWeight: 'bold' }}>Enemy</span>
                                                <span style={{ fontSize: '0.7rem', color: '#fff' }}>{Math.ceil(combat.mobHealth)} HP</span>
                                            </div>
                                            <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                                <div style={{
                                                    width: `${(combat.mobHealth / combat.mobMaxHealth) * 100}% `,
                                                    height: '100%',
                                                    background: '#ff4444',
                                                    transition: 'width 0.2s'
                                                }} />
                                            </div>
                                        </div>

                                        {/* Barra HP Player */}
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                                <span style={{ fontSize: '0.7rem', color: '#4caf50', fontWeight: 'bold' }}>You</span>
                                                <span style={{ fontSize: '0.7rem', color: '#fff' }}>{Math.ceil(combat.playerHealth)} HP</span>
                                            </div>
                                            <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                                <div style={{
                                                    width: `${Math.min(100, (combat.playerHealth / 100) * 100)}% `, // TODO: Usar maxHealth real se disponível no state
                                                    height: '100%',
                                                    background: '#4caf50',
                                                    transition: 'width 0.2s'
                                                }} />
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={stopCombat}
                                        style={{
                                            width: '100%',
                                            background: 'rgba(255, 68, 68, 0.1)',
                                            border: '1px solid rgba(255, 68, 68, 0.5)',
                                            color: '#ff4444',
                                            padding: '8px',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontWeight: '900',
                                            fontSize: '0.7rem',
                                            letterSpacing: '1px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            transition: '0.2s'
                                        }}
                                    >
                                        <Skull size={14} />
                                        FLEE
                                    </button>
                                </motion.div>
                            )}

                            {/* --- CARD DE DUNGEON (Se houver) --- */}
                            {(dungeonState && dungeonState.active) && (
                                <motion.div
                                    initial={{ opacity: 0, x: 20, scale: 0.95 }}
                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                    exit={{ opacity: 0, x: 20, scale: 0.95 }}
                                    onClick={() => {
                                        if (onNavigate) {
                                            onNavigate('dungeon');
                                            setIsOpen(false);
                                        }
                                    }}
                                    style={{
                                        width: '280px',
                                        maxWidth: 'calc(100vw - 60px)',
                                        background: 'rgba(20, 10, 30, 0.95)',
                                        backdropFilter: 'blur(20px)',
                                        border: '1px solid rgba(174, 0, 255, 0.3)',
                                        borderRadius: '12px',
                                        padding: '12px',
                                        boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
                                        overflow: 'hidden',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {/* Header Dungeon */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{
                                                width: '32px', height: '32px', borderRadius: '8px',
                                                background: 'rgba(174, 0, 255, 0.1)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                border: '1px solid rgba(174, 0, 255, 0.3)',
                                            }}>
                                                <Skull size={18} color="#ae00ff" />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.55rem', color: '#ae00ff', fontWeight: '900', letterSpacing: '0.5px' }}>ACTIVE DUNGEON</div>
                                                <div style={{ fontSize: '0.8rem', color: '#fff', fontWeight: '900' }}>Tier {dungeonState.tier}</div>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right', display: 'flex', gap: '15px' }}>
                                            <div>
                                                <div style={{ fontSize: '0.55rem', color: '#aaa', fontWeight: 'bold' }}>DURATION</div>
                                                <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#fff', fontWeight: 'bold' }}>
                                                    {formatTime(dungeonElapsed)}
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.55rem', color: '#aaa', fontWeight: 'bold' }}>WAVE</div>
                                                <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#fff', fontWeight: 'bold' }}>
                                                    {dungeonState.wave}/{dungeonState.maxWaves}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Info Dungeon */}
                                    <div style={{
                                        background: 'rgba(0,0,0,0.3)',
                                        borderRadius: '6px',
                                        padding: '8px',
                                        marginBottom: '10px',
                                        border: '1px solid rgba(174, 0, 255, 0.1)'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.8rem', color: '#ae00ff', fontWeight: 'bold' }}>
                                                {dungeonState.status === 'WALKING' ? "Walking..." :
                                                    dungeonState.status === 'FIGHTING' ? "Fighting..." :
                                                        dungeonState.status === 'BOSS_FIGHT' ? "BOSS FIGHT" :
                                                            dungeonState.status}
                                            </span>
                                            {dungeonState.repeatCount > 0 && (
                                                <span style={{ fontSize: '0.7rem', color: '#aaa' }}>
                                                    Queue: {dungeonState.repeatCount}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (socket) socket.emit('stop_dungeon');
                                            setIsOpen(false);
                                        }}
                                        style={{
                                            width: '100%',
                                            background: dungeonState.status === 'COMPLETED' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 59, 48, 0.1)',
                                            border: '1px solid',
                                            borderColor: dungeonState.status === 'COMPLETED' ? 'rgba(76, 175, 80, 0.5)' : 'rgba(255, 59, 48, 0.5)',
                                            color: dungeonState.status === 'COMPLETED' ? '#4caf50' : '#ff3b30',
                                            padding: '8px',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontWeight: '900',
                                            fontSize: '0.7rem',
                                            letterSpacing: '1px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            transition: '0.2s'
                                        }}
                                    >
                                        <Skull size={14} />
                                        {dungeonState.status === 'COMPLETED' ? 'FINISH' : 'ABANDON'}
                                    </button>
                                </motion.div>
                            )}

                        </div>
                    </>
                )}
            </AnimatePresence >
        </>
    );
};

export default ActivityWidget;
