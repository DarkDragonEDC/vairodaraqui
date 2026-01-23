import React, { useState, useEffect } from 'react';
import { Skull, Map as MapIcon, Shield, Lock, ChevronRight, AlertTriangle, Star, Coins, History } from 'lucide-react';
import { ITEMS } from '@shared/items';
import { MONSTERS } from '@shared/monsters';
import { DUNGEONS } from '@shared/dungeons';
import DungeonHistoryModal from './DungeonHistoryModal';
import { motion, AnimatePresence } from 'framer-motion';

const DungeonPanel = ({ gameState, socket, isMobile }) => {
    const [selectedTier, setSelectedTier] = useState(1);
    const [showModal, setShowModal] = useState(false);
    const [pendingTier, setPendingTier] = useState(null);
    const [repeatCount, setRepeatCount] = useState(1);
    const [history, setHistory] = useState([]);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    React.useEffect(() => {
        if (socket) {
            socket.on('dungeon_history_update', (data) => {
                setHistory(data);
            });
            // Initial fetch
            socket.emit('get_dungeon_history');
        }
        return () => {
            if (socket) {
                socket.off('dungeon_history_update');
            }
        };
    }, [socket]);

    const handleEnterClick = (tier) => {
        setPendingTier(tier);
        setRepeatCount(1); // Reset to 1
        setShowModal(true);
    };

    const confirmEnterDungeon = () => {
        if (pendingTier) {
            const dungeon = Object.values(DUNGEONS).find(d => d.tier === pendingTier);
            if (dungeon) {
                // repeatCount is total runs, so we send repeatCount - 1 as "extra repeats"
                const totalRuns = parseInt(repeatCount, 10) || 1;
                socket.emit('start_dungeon', {
                    dungeonId: dungeon.id,
                    repeatCount: Math.max(0, totalRuns - 1)
                });
            }
        }
        setShowModal(false);
        setPendingTier(null);
    };

    const dungeonState = gameState?.dungeon_state || gameState?.state?.dungeon; // Handle both structures

    // Local timer for smooth UI updates
    const [now, setNow] = useState(Date.now());

    React.useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    const getEstimatedTime = () => {
        if (!dungeonState || !dungeonState.active) return null;

        const wavesRemaining = dungeonState.maxWaves - dungeonState.wave;
        const waveDuration = 60 * 1000;

        let currentWaveElapsed = 0;
        if (dungeonState.wave_started_at) {
            currentWaveElapsed = now - dungeonState.wave_started_at;
        }

        const repeats = dungeonState.repeatCount || 0;
        const fullRunDuration = dungeonState.maxWaves * waveDuration;

        // Time left in current wave (min 0)
        const currentWaveLeft = Math.max(0, waveDuration - currentWaveElapsed);

        // Current Run Remaining
        const currentRunMs = currentWaveLeft + (wavesRemaining * waveDuration);

        // Total Queue Remaining
        const queueMs = currentRunMs + (repeats * fullRunDuration);

        const formatTime = (ms) => {
            const h = Math.floor(ms / 3600000);
            const m = Math.floor((ms % 3600000) / 60000);
            const s = Math.floor((ms % 60000) / 1000);
            if (h > 0) return `${h}h ${m}m ${s}s`;
            return `${m}m ${s}s`;
        };

        return {
            current: formatTime(currentRunMs),
            queue: formatTime(queueMs)
        };
    };

    const estimatedTime = getEstimatedTime();

    // If inside a dungeon, show status
    if (dungeonState && dungeonState.active) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-panel"
                style={{
                    padding: '20px',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    background: 'linear-gradient(135deg, rgba(15, 20, 30, 0.95) 0%, rgba(10, 5, 20, 0.95) 100%)',
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                {/* Background Glow */}
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '200px',
                    height: '200px',
                    background: dungeonState.status === 'BOSS_FIGHT' ? 'rgba(255, 0, 0, 0.08)' : 'rgba(174, 0, 255, 0.04)',
                    filter: 'blur(80px)',
                    borderRadius: '50%',
                    pointerEvents: 'none',
                    zIndex: 0
                }} />

                <div style={{ display: 'flex', gap: '20px', textAlign: 'center', zIndex: 1, background: 'rgba(0,0,0,0.3)', padding: '10px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div>
                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', fontWeight: '900', letterSpacing: '0.5px', marginBottom: '2px', textTransform: 'uppercase' }}>
                            Current Run
                        </div>
                        <div style={{ color: '#ae00ff', fontSize: '1.1rem', fontWeight: '900', fontFamily: 'monospace' }}>
                            {estimatedTime?.current || '--'}
                        </div>
                    </div>
                    <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                    <div>
                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', fontWeight: '900', letterSpacing: '0.5px', marginBottom: '2px', textTransform: 'uppercase' }}>
                            Total Queue
                        </div>
                        <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: '900', fontFamily: 'monospace' }}>
                            {estimatedTime?.queue || '--'}
                        </div>
                    </div>
                </div>

                <motion.div
                    animate={{
                        scale: dungeonState.status === 'FIGHTING' || dungeonState.status === 'BOSS_FIGHT' ? [1, 1.05, 1] : 1
                    }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    style={{ fontSize: '2.5rem', color: dungeonState.status === 'BOSS_FIGHT' ? '#ff0000' : '#ff4444', zIndex: 1 }}
                >
                    <Skull size={48} strokeWidth={1.5} />
                </motion.div>

                <div style={{ textAlign: 'center', zIndex: 1 }}>
                    <motion.h2
                        key={dungeonState.wave}
                        style={{ color: '#fff', fontSize: '1.4rem', fontWeight: '900', margin: 0, letterSpacing: '1px' }}
                    >
                        {dungeonState.status === 'BOSS_FIGHT' ? 'THE BOSS' : `WAVE ${dungeonState.wave} / ${dungeonState.maxWaves}`}
                    </motion.h2>
                    <div style={{ height: '20px', marginTop: '2px' }}>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={dungeonState.status}
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                style={{
                                    color: dungeonState.status === 'COMPLETED' ? '#4caf50' :
                                        dungeonState.status === 'FAILED' ? '#ff4444' :
                                            dungeonState.status === 'BOSS_FIGHT' ? '#ff0000' : '#aaa',
                                    fontSize: '0.85rem',
                                    fontWeight: 'bold',
                                    textTransform: 'uppercase'
                                }}
                            >
                                {dungeonState.status === 'PREPARING' && "Preparing..."}
                                {dungeonState.status === 'FIGHTING' && "In Combat"}
                                {dungeonState.status === 'WAITING_NEXT_WAVE' && "Next wave incoming..."}
                                {dungeonState.status === 'BOSS_FIGHT' && "BOSS FIGHT!"}
                                {dungeonState.status === 'WALKING' && `Walking... (${dungeonState.timeLeft || '?'}s)`}
                                {dungeonState.status === 'WAITING_EXIT' && `Exit in ${dungeonState.timeLeft || '?'}s`}
                                {dungeonState.status === 'COMPLETED' && "CLEARED!"}
                                {dungeonState.status === 'ERROR' && "ERROR"}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

                <div style={{
                    padding: '4px 12px',
                    background: 'rgba(174, 0, 255, 0.1)',
                    borderRadius: '12px',
                    border: '1px solid rgba(174, 0, 255, 0.2)',
                    color: '#ae00ff',
                    fontSize: '0.7rem',
                    fontWeight: '900',
                    zIndex: 1
                }}>
                    {dungeonState.repeatCount > 0 ? `REMAINING: ${dungeonState.repeatCount}` : "FINAL RUN"}
                </div>

                {/* Real-time Loot Summary (Aggregated) */}
                <div
                    style={{
                        width: '100%',
                        maxWidth: '420px',
                        background: 'rgba(0,0,0,0.4)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '16px',
                        padding: '12px 16px',
                        zIndex: 1
                    }}
                >
                    <div style={{ color: '#ae00ff', fontWeight: '900', fontSize: '0.6rem', letterSpacing: '1px', marginBottom: '10px', textTransform: 'uppercase', textAlign: 'center', opacity: 0.7 }}>
                        Session Rewards
                    </div>
                    {dungeonState.lootLog && dungeonState.lootLog.length > 0 ? (
                        (() => {
                            const totals = dungeonState.lootLog.reduce((acc, log) => {
                                acc.xp += (log.xp || 0);
                                acc.silver += (log.silver || 0);
                                (log.items || []).forEach(itemStr => {
                                    const match = itemStr.match(/^(\d+)x\s+(.+)$/);
                                    if (match) {
                                        const qty = parseInt(match[1]);
                                        const id = match[2];
                                        acc.items[id] = (acc.items[id] || 0) + qty;
                                    } else {
                                        acc.items[itemStr] = (acc.items[itemStr] || 0) + 1;
                                    }
                                });
                                return acc;
                            }, { xp: 0, silver: 0, items: {} });

                            return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                        <div style={{ background: 'rgba(76, 175, 80, 0.05)', padding: '8px', borderRadius: '10px', textAlign: 'center', border: '1px solid rgba(76, 175, 80, 0.1)' }}>
                                            <div style={{ color: 'rgba(76, 175, 80, 0.6)', fontSize: '0.55rem', fontWeight: '900' }}>XP</div>
                                            <div style={{ color: '#4caf50', fontWeight: '900', fontSize: '1rem' }}>+{totals.xp.toLocaleString()}</div>
                                        </div>
                                        <div style={{ background: 'rgba(255, 215, 0, 0.05)', padding: '8px', borderRadius: '10px', textAlign: 'center', border: '1px solid rgba(255, 215, 0, 0.1)' }}>
                                            <div style={{ color: 'rgba(255, 215, 0, 0.6)', fontSize: '0.55rem', fontWeight: '900' }}>SILVER</div>
                                            <div style={{ color: '#ffd700', fontWeight: '900', fontSize: '1rem' }}>+{totals.silver.toLocaleString()}</div>
                                        </div>
                                    </div>

                                    {Object.keys(totals.items).length > 0 && (
                                        <div style={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            gap: '5px',
                                            justifyContent: 'center',
                                            maxHeight: '80px',
                                            overflowY: 'auto',
                                            padding: '8px',
                                            background: 'rgba(0,0,0,0.2)',
                                            borderRadius: '10px'
                                        }}>
                                            {Object.entries(totals.items).map(([id, qty]) => (
                                                <div key={id} style={{
                                                    background: 'rgba(174, 0, 255, 0.1)',
                                                    color: '#ae00ff',
                                                    padding: '3px 8px',
                                                    borderRadius: '6px',
                                                    fontSize: '0.7rem',
                                                    border: '1px solid rgba(174, 0, 255, 0.2)',
                                                    fontWeight: 'bold'
                                                }}>
                                                    {qty}x {id.replace(/_/g, ' ')}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })()
                    ) : (
                        <div style={{ color: '#555', fontStyle: 'italic', textAlign: 'center', fontSize: '0.7rem' }}>
                            Waiting for rewards...
                        </div>
                    )}
                </div>

                <button
                    onClick={() => socket.emit('stop_dungeon')}
                    style={{
                        padding: '8px 20px',
                        background: dungeonState.status === 'COMPLETED' ? 'rgba(76, 175, 80, 0.05)' : 'rgba(255, 68, 68, 0.05)',
                        border: '1px solid',
                        borderColor: dungeonState.status === 'COMPLETED' ? 'rgba(76, 175, 80, 0.5)' : '#ff4444',
                        color: dungeonState.status === 'COMPLETED' ? '#4caf50' : '#ff4444',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontWeight: '900',
                        fontSize: '0.75rem',
                        zIndex: 1,
                        transition: '0.2s'
                    }}
                >
                    {dungeonState.status === 'COMPLETED' ? 'FINISH' : 'ABANDON'}
                </button>
            </motion.div>
        );
    }

    const inventory = gameState?.state?.inventory || {};

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '10px', gap: '15px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <MapIcon color="#ae00ff" size={24} />
                    <h2 style={{ margin: 0, color: '#fff', fontSize: '1.2rem' }}>Dungeons</h2>
                </div>
                <button
                    onClick={() => {
                        setIsHistoryOpen(true);
                        socket.emit('get_dungeon_history');
                    }}
                    style={{
                        background: 'rgba(174, 0, 255, 0.1)',
                        border: '1px solid #ae00ff',
                        color: '#ae00ff',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 'bold'
                    }}
                >
                    <History size={16} />
                    HISTORY
                </button>
            </div>

            <div className="scroll-container" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ padding: '10px', background: 'rgba(255, 68, 68, 0.1)', borderRadius: '8px', border: '1px solid rgba(255, 68, 68, 0.3)', display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <AlertTriangle color="#ff4444" size={20} />
                    <div style={{ fontSize: '0.8rem', color: '#ddd' }}>
                        Hardcore: Instant fail on death.
                    </div>
                </div>

                {Object.values(DUNGEONS).map(dungeon => {
                    const tier = dungeon.tier;
                    const mapId = dungeon.reqItem;
                    const hasMap = (inventory[mapId] || 0) > 0;

                    const bossName = dungeon.bossId ? dungeon.bossId.replace('BOSS_', '').replace(/_/g, ' ') : 'Unknown Boss';

                    // Lookup Boss Loot for Crests
                    let crestId = null;
                    if (dungeon.bossId && MONSTERS[tier]) {
                        const boss = MONSTERS[tier].find(m => m.id === dungeon.bossId);
                        if (boss && boss.loot) {
                            crestId = Object.keys(boss.loot).find(key => key.includes('_CREST'));
                        }
                    }

                    return (
                        <div key={dungeon.id} style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            borderRadius: '12px',
                            padding: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            opacity: hasMap ? 1 : 0.7
                        }}>
                            {/* Header: Tier + Name + Status */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <div style={{
                                        width: '40px', height: '40px',
                                        background: 'rgba(0,0,0,0.3)',
                                        borderRadius: '8px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        border: `1px solid ${hasMap ? '#ae00ff' : '#444'}`
                                    }}>
                                        <span style={{ fontSize: '1rem', fontWeight: 'bold', color: hasMap ? '#ae00ff' : '#666' }}>T{tier}</span>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#fff' }}>{dungeon.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#888' }}>
                                            Req: <span style={{ color: hasMap ? '#4caf50' : '#ff4444' }}>1x {ITEMS[mapId]?.name || mapId}</span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleEnterClick(tier)}
                                    disabled={!hasMap}
                                    style={{
                                        padding: '6px 12px',
                                        background: hasMap ? '#ae00ff' : 'rgba(255,255,255,0.05)',
                                        color: hasMap ? '#fff' : '#555',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: hasMap ? 'pointer' : 'not-allowed',
                                        fontWeight: 'bold',
                                        fontSize: '0.8rem'
                                    }}
                                >
                                    {hasMap ? 'ENTER' : 'LOCKED'}
                                </button>
                            </div>

                            {/* Dungeon Details Grid */}
                            <div style={{
                                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px',
                                background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '8px'
                            }}>
                                <div style={{ fontSize: '0.75rem', color: '#aaa' }}> Boss: <span style={{ color: '#ff4444' }}>{bossName}</span></div>
                                <div style={{ fontSize: '0.75rem', color: '#aaa', textAlign: 'right' }}> Waves: <span style={{ color: '#fff' }}>{dungeon.waves}</span></div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal Overlay */}
            {showModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div className="glass-panel" style={{
                        padding: '20px',
                        width: '320px',
                        display: 'flex', flexDirection: 'column', gap: '15px',
                        borderRadius: '16px',
                        border: '1px solid #ae00ff'
                    }}>
                        <h3 style={{ margin: 0, color: '#fff', textAlign: 'center', fontSize: '1rem' }}>Total Runs T{pendingTier}</h3>

                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center' }}>
                            <button onClick={() => setRepeatCount(prev => Math.max(1, (parseInt(prev) || 0) - 1))} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', border: '1px solid #444', fontWeight: 'bold' }}>-</button>
                            <input
                                type="number"
                                value={repeatCount}
                                onChange={(e) => setRepeatCount(Math.max(1, parseInt(e.target.value) || 1))}
                                style={{ width: '60px', padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid #ae00ff', color: '#fff', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold' }}
                            />
                            <button onClick={() => setRepeatCount(prev => (parseInt(prev) || 0) + 1)} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', border: '1px solid #444', fontWeight: 'bold' }}>+</button>
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.05)', color: '#aaa', borderRadius: '10px', border: '1px solid #444' }}>CANCEL</button>
                            <button onClick={confirmEnterDungeon} style={{ flex: 1, padding: '10px', background: '#ae00ff', color: '#fff', borderRadius: '10px', border: 'none', fontWeight: 'bold' }}>START</button>
                        </div>
                    </div>
                </div>
            )}

            <DungeonHistoryModal
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
                history={history}
            />
        </div>
    );
};

export default DungeonPanel;
