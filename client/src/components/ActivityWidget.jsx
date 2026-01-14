import React, { useState, useEffect } from 'react';
import { Play, CheckCircle, Clock, Square, Zap, Hammer, Pickaxe, Box, Loader, Hourglass, Sword, Skull, Heart, Apple } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ActivityWidget = ({ gameState, onStop, socket, onNavigate, serverTimeOffset = 0 }) => { // Changed onClaim to onStop
    const [isOpen, setIsOpen] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [combatElapsed, setCombatElapsed] = useState(0);

    const activity = gameState?.current_activity;
    const combat = gameState?.state?.combat;

    // Timer para Atividade
    useEffect(() => {
        if (!activity || !gameState?.activity_started_at) return;

        const interval = setInterval(() => {
            const start = new Date(gameState?.activity_started_at).getTime();
            const now = Date.now() + serverTimeOffset;
            setElapsed((now - start) / 1000);
        }, 100);

        return () => clearInterval(interval);
    }, [activity, gameState?.activity_started_at]);

    // Timer para Combate
    useEffect(() => {
        if (!combat) return;

        // Se started_at não existir no combat, usa data atual (fallback)
        const startTime = combat.started_at ? new Date(combat.started_at).getTime() : Date.now();

        const interval = setInterval(() => {
            setCombatElapsed(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);

        return () => clearInterval(interval);
    }, [combat, combat?.started_at]);

    // Se não há nada ativo, não renderiza
    if (!activity && !combat) return null;

    const isGathering = activity?.type === 'GATHERING';
    const isRefining = activity?.type === 'REFINING';
    const isCrafting = activity?.type === 'CRAFTING';

    // Stats Calculations (Activity)
    const initialQty = activity?.initial_quantity || activity?.actions_remaining || 1;
    const remainingQty = activity?.actions_remaining || 0;
    const doneQty = Math.max(0, initialQty - remainingQty);
    const timePerAction = activity?.time_per_action || 3;

    // Tempo total decorrido considerando itens já feitos + tempo no item atual
    const totalElapsed = (doneQty * timePerAction) + (elapsed % timePerAction);
    const totalDuration = initialQty * timePerAction;
    const totalProgress = Math.min(100, (totalElapsed / totalDuration) * 100);
    const remainingSeconds = Math.max(0, totalDuration - totalElapsed);

    // Formatar Tempo (MM:SS)
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
        if (isGathering) return 'COLETANDO';
        if (isRefining) return 'REFINANDO';
        if (isCrafting) return 'CRAFTING';
        return 'TRABALHANDO';
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
                    bottom: '80px',
                    right: '30px',
                    width: '64px',
                    height: '64px',
                    borderRadius: '16px',
                    background: combat ? 'rgba(50, 10, 10, 0.95)' : 'rgba(15, 20, 30, 0.95)',
                    border: combat ? '1px solid #ff4444' : '1px solid #d4af37',
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
                        combat ? <Sword size={24} color="#ff4444" /> : getActivityIcon()
                    )}
                    <motion.div
                        animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.1, 1] }}
                        transition={{ repeat: Infinity, duration: combat ? 0.8 : 2 }} // Pulsa mais rápido em combate
                        style={{
                            position: 'absolute',
                            width: '100%',
                            height: '100%',
                            borderRadius: '50%',
                            boxShadow: combat ? '0 0 20px rgba(255, 68, 68, 0.4)' : '0 0 15px rgba(212, 175, 55, 0.3)'
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
                            bottom: '160px',
                            right: '30px',
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
                                        width: '320px',
                                        maxWidth: 'calc(100vw - 60px)',
                                        background: 'rgba(15, 20, 30, 0.95)',
                                        backdropFilter: 'blur(20px)',
                                        border: '1px solid rgba(212, 175, 55, 0.2)',
                                        borderRadius: '16px',
                                        padding: '20px',
                                        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                                        overflow: 'hidden',
                                        cursor: 'pointer' // Indicate clickable
                                    }}
                                >
                                    {/* Header Activity */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{
                                                width: '40px', height: '40px', borderRadius: '10px',
                                                background: 'rgba(212, 175, 55, 0.1)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                border: '1px solid rgba(212, 175, 55, 0.2)'
                                            }}>
                                                <motion.div
                                                    animate={{ rotate: isRefining || isCrafting ? 360 : 0, y: isGathering ? [0, -2, 0] : 0 }}
                                                    transition={{ repeat: Infinity, duration: isGathering ? 0.5 : 2, ease: "linear" }}
                                                >
                                                    {getActivityIcon()}
                                                </motion.div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.65rem', color: '#888', fontWeight: '900', letterSpacing: '1px' }}>ATIVIDADE ATUAL</div>
                                                <div style={{ fontSize: '0.9rem', color: '#d4af37', fontWeight: '900', letterSpacing: '0.5px' }}>{getActionName()}</div>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '0.65rem', color: '#888', fontWeight: 'bold' }}>DECORRIDO</div>
                                            <div style={{ fontFamily: 'monospace', fontSize: '1rem', color: '#fff', fontWeight: 'bold' }}>
                                                {formatTime(elapsed)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Info Activity */}
                                    <div style={{
                                        background: 'rgba(255,255,255,0.03)',
                                        borderRadius: '8px',
                                        padding: '10px',
                                        marginBottom: '15px',
                                        border: '1px solid rgba(255,255,255,0.05)'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                            <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.9rem' }}>{activity.item_id || 'Item Desconhecido'}</span>
                                            <span style={{ color: '#d4af37', fontWeight: 'bold', fontSize: '0.9rem' }}>{doneQty} <span style={{ fontSize: '0.7rem', color: '#666' }}>/ {initialQty}</span></span>
                                        </div>

                                        {/* Barra de Progresso do Item Atual */}
                                        <div style={{ height: '6px', background: 'rgba(0,0,0,0.5)', borderRadius: '3px', overflow: 'hidden', position: 'relative', marginBottom: '4px' }}>
                                            <div
                                                style={{
                                                    width: `${Math.max(0, Math.min(100, (1 - ((Number(activity?.next_action_at) - (Date.now() + serverTimeOffset)) / (timePerAction * 1000))) * 100))}% `,
                                                    height: '100%',
                                                    background: '#d4af37',
                                                    transition: 'width 0.1s linear'
                                                }}
                                            />
                                        </div>

                                        {/* Barra de Progresso Total */}
                                        <div style={{ height: '2px', background: 'rgba(255,255,255,0.05)', borderRadius: '1px', overflow: 'hidden', position: 'relative' }}>
                                            <div style={{ width: `${totalProgress}% `, height: '100%', background: 'rgba(212, 175, 55, 0.4)', transition: 'width 0.3s' }} />
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.65rem', color: '#666' }}>
                                            <span>{doneQty} concluídos</span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                <Hourglass size={8} /> Restam ~{formatTime(remainingSeconds)}
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
                                            padding: '12px',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontWeight: '900',
                                            fontSize: '0.8rem',
                                            letterSpacing: '1px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            transition: '0.2s'
                                        }}
                                    >
                                        <Square size={14} fill="#d4af37" />
                                        PARAR
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
                                        width: '320px',
                                        maxWidth: 'calc(100vw - 60px)',
                                        background: 'rgba(20, 10, 10, 0.95)',
                                        backdropFilter: 'blur(20px)',
                                        border: '1px solid rgba(255, 68, 68, 0.3)',
                                        borderRadius: '16px',
                                        padding: '20px',
                                        boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
                                        overflow: 'hidden',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {/* Header Combat */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{
                                                width: '40px', height: '40px', borderRadius: '10px',
                                                background: 'rgba(255, 68, 68, 0.1)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                border: '1px solid rgba(255, 68, 68, 0.3)',
                                                position: 'relative'
                                            }}>
                                                <motion.div
                                                    animate={{ rotate: [-10, 10, -10], scale: [1, 1.1, 1] }}
                                                    transition={{ repeat: Infinity, duration: 1 }}
                                                >
                                                    <Sword size={24} color="#ff4444" />
                                                </motion.div>
                                                {gameState?.state?.equipment?.food?.amount > 0 && (
                                                    <div style={{
                                                        position: 'absolute', top: -5, right: -5,
                                                        background: '#ff4d4d', color: '#fff', fontSize: '0.55rem',
                                                        fontWeight: '900', padding: '1px 4px', borderRadius: '4px',
                                                        border: '1px solid rgba(255,255,255,0.2)'
                                                    }}>
                                                        x{gameState.state.equipment.food.amount}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.65rem', color: '#ff8888', fontWeight: '900', letterSpacing: '1px' }}>COMBATE ATIVO</div>
                                                <div style={{ fontSize: '0.9rem', color: '#ff4444', fontWeight: '900', letterSpacing: '0.5px' }}>{combat.mobName}</div>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '0.65rem', color: '#ff8888', fontWeight: 'bold' }}>DURAÇÃO</div>
                                            <div style={{ fontFamily: 'monospace', fontSize: '1rem', color: '#fff', fontWeight: 'bold' }}>
                                                {formatTime(combatElapsed)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Info Combat */}
                                    <div style={{
                                        background: 'rgba(0,0,0,0.3)',
                                        borderRadius: '8px',
                                        padding: '10px',
                                        marginBottom: '15px',
                                        border: '1px solid rgba(255, 68, 68, 0.1)'
                                    }}>
                                        {/* Barra HP Mob */}
                                        <div style={{ marginBottom: '8px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                                <span style={{ fontSize: '0.7rem', color: '#ff4444', fontWeight: 'bold' }}>Inimigo</span>
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
                                                <span style={{ fontSize: '0.7rem', color: '#4caf50', fontWeight: 'bold' }}>Você</span>
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
                                            padding: '12px',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontWeight: '900',
                                            fontSize: '0.8rem',
                                            letterSpacing: '1px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            transition: '0.2s'
                                        }}
                                    >
                                        <Skull size={14} />
                                        FUGIR
                                    </button>
                                </motion.div>
                            )}

                        </div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};

export default ActivityWidget;
