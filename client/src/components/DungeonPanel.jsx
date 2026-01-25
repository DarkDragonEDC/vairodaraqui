import React, { useState, useEffect } from 'react';
import { Skull, Map as MapIcon, Shield, Lock, ChevronRight, AlertTriangle, Star, Coins, History, Heart, Sword, Package, Layers, Clock, Sparkles } from 'lucide-react';
import { ITEMS, resolveItem } from '@shared/items';
import { MONSTERS } from '@shared/monsters';
import { DUNGEONS } from '@shared/dungeons';
import DungeonHistoryModal from './DungeonHistoryModal';
import { motion, AnimatePresence } from 'framer-motion';

const DungeonPanel = ({ gameState, socket, isMobile, serverTimeOffset = 0 }) => {
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

    const calculateEstimatedTime = (tier, count) => {
        const dungeon = Object.values(DUNGEONS).find(d => d.tier === tier);
        if (!dungeon || !gameState?.calculatedStats) return 0;

        const stats = gameState.calculatedStats;
        const playerDmg = stats.damage || 1;
        const attackSpeed = stats.attackSpeed || 1000;

        const mobs = MONSTERS[tier] || [];
        const boss = mobs.find(m => m.id === dungeon.bossId);
        const trash = mobs.filter(m => dungeon.trashMobs.includes(m.id));

        if (!boss || trash.length === 0) return 0;

        const trashMobIds = dungeon.trashMobs || [];

        let totalDungeonTime = 0;

        // Wave 1-4: Trash Mobs with Scaling (1.0x, 1.1x, 1.2x, 1.3x)
        trashMobIds.forEach((mobId, index) => {
            const mob = MONSTERS[tier]?.find(m => m.id === mobId);
            if (mob) {
                const scaling = 1 + (index * 0.1);
                const mobDef = (mob.defense || 0) * scaling;
                const mobHealth = mob.health * scaling;
                const mobMitigation = mobDef / (mobDef + 2000);
                const mitigatedDmg = Math.max(1, Math.floor(playerDmg * (1 - mobMitigation)));
                const killTime = Math.ceil(mobHealth / mitigatedDmg) * attackSpeed;
                totalDungeonTime += Math.max(60000, killTime);
            }
        });

        // Wave 5: Boss with 1.5x Scaling
        if (boss) {
            const scaling = 1.5;
            const bossDef = (boss.defense || 0) * scaling;
            const bossHealth = boss.health * scaling;
            const bossMitigation = bossDef / (bossDef + 2000);
            const mitigatedBossDmg = Math.max(1, Math.floor(playerDmg * (1 - bossMitigation)));
            const bossKillTime = Math.ceil(bossHealth / mitigatedBossDmg) * attackSpeed;
            totalDungeonTime += Math.max(60000, bossKillTime);
        }

        return totalDungeonTime * count;
    };

    const formatDuration = (ms) => {
        const seconds = Math.floor(ms / 1000);
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return `${h}h ${m}m ${s}s`;
        if (m > 0) return `${m}m ${s}s`;
        return `${s}s`;
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

    // Local timer for smooth UI updates - Synced with server
    const [now, setNow] = useState(Date.now() + serverTimeOffset);
    React.useEffect(() => {
        const timer = setInterval(() => setNow(Date.now() + serverTimeOffset), 1000);
        return () => clearInterval(timer);
    }, [serverTimeOffset]);

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
                    {(() => {
                        let total, current;
                        if (dungeonState.initialRepeats !== undefined) {
                            // New logic (Server-driven)
                            total = dungeonState.initialRepeats + 1;
                            current = total - dungeonState.repeatCount;
                        } else {
                            // Fallback logic for existing active sessions
                            // inferredTotal = completed (lootLog) + current (1) + remaining (repeatCount)
                            const completed = (dungeonState.lootLog || []).length;
                            const remaining = dungeonState.repeatCount || 0;
                            total = completed + 1 + remaining;
                            current = completed + 1;
                        }
                        return `RUN: ${current} / ${total}`;
                    })()}
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
            {/* New Hunting Grounds Header */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Sword color="#ff4444" size={18} />
                        <h2 style={{ margin: 0, color: '#fff', fontSize: '0.9rem', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase' }}>Hunting Grounds</h2>
                    </div>
                    <button
                        onClick={() => {
                            setIsHistoryOpen(true);
                            socket.emit('get_dungeon_history');
                        }}
                        style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', padding: '3px 8px', borderRadius: '4px', color: 'rgba(255, 255, 255, 0.3)', cursor: 'pointer', fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                        <Clock size={12} /> HISTORY
                    </button>
                </div>
                <div className="scroll-container-h" style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(t => (
                        <button
                            key={t}
                            onClick={() => setSelectedTier(t)}
                            style={{
                                padding: '4px 12px',
                                flexShrink: 0,
                                background: selectedTier === t ? 'rgba(255, 44, 44, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                                border: '1px solid',
                                borderColor: selectedTier === t ? '#ff4444' : 'rgba(255, 255, 255, 0.05)',
                                borderRadius: '4px',
                                color: selectedTier === t ? '#ff4444' : '#555',
                                fontSize: '0.7rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: '0.2s'
                            }}
                        >
                            T{t}
                        </button>
                    ))}
                </div>
            </div>

            <div className="scroll-container" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '4px' }}>
                <div style={{ padding: '12px 16px', background: 'rgba(255, 68, 68, 0.05)', borderRadius: '12px', border: '1px solid rgba(255, 68, 68, 0.2)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <AlertTriangle color="#ff4444" size={20} />
                    <div style={{ fontSize: '0.8rem', color: '#ff4444', fontWeight: 'bold' }}>
                        HARDCORE MODE: If you die in a dungeon, it ends immediately and you lose your progress.
                    </div>
                </div>

                {Object.values(DUNGEONS)
                    .filter(d => d.tier === selectedTier)
                    .map(dungeon => {
                        const tier = dungeon.tier;
                        const mapId = dungeon.reqItem;
                        const mapQty = inventory[mapId] || 0;
                        const hasMap = mapQty > 0;

                        const dungeonLevel = gameState?.state?.skills?.DUNGEONEERING?.level || 1;
                        const reqLevel = (tier === 1 ? 1 : (tier - 1) * 10);
                        const levelLocked = dungeonLevel < reqLevel;
                        const isTotalLocked = levelLocked;

                        const estimatedTimeRun = calculateEstimatedTime(tier, 1);

                        // Possible Loot
                        const lootItems = [];
                        if (dungeon.rewards?.resource) lootItems.push({ id: dungeon.rewards.resource.id, chance: dungeon.rewards.resource.chance });

                        // Boss Loot (Crests)
                        const bossMob = MONSTERS[tier]?.find(m => m.id === dungeon.bossId);
                        if (bossMob && bossMob.loot) {
                            Object.entries(bossMob.loot).forEach(([itemId, chance]) => {
                                if (itemId.includes('_CREST')) lootItems.push({ id: itemId, chance });
                            });
                        }

                        return (
                            <motion.div
                                key={dungeon.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{
                                    position: 'relative',
                                    padding: '20px',
                                    background: '#1E2330',
                                    borderRadius: '12px',
                                    border: `1px solid ${levelLocked ? 'rgba(255, 68, 68, 0.3)' : 'rgba(174, 0, 255, 0.3)'}`,
                                    opacity: levelLocked ? 0.8 : 1,
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {/* Header Info */}
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                        <div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#fff' }}>{dungeon.name}</h3>
                                                {levelLocked ? (
                                                    <span style={{ fontSize: '0.65rem', background: 'rgba(255, 68, 68, 0.2)', color: '#ff6b6b', px: '8px', py: '2px', borderRadius: '4px', fontWeight: 'bold', textTransform: 'uppercase' }}>Requires Level {reqLevel}</span>
                                                ) : (
                                                    <span style={{ fontSize: '0.65rem', background: 'rgba(174, 0, 255, 0.2)', color: '#ae00ff', px: '8px', py: '2px', borderRadius: '4px', fontWeight: 'bold', textTransform: 'uppercase' }}>Tier {tier}</span>
                                                )}
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: '#8B8D91', fontSize: '0.8rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Sparkles size={14} color="#ffd700" />
                                                    <span>{dungeon.rewards.xp.toLocaleString()} XP</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Clock size={14} color="#8B8D91" />
                                                    <span>{formatDuration(estimatedTimeRun)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleEnterClick(tier)}
                                            disabled={levelLocked}
                                            style={{
                                                padding: '8px 20px',
                                                borderRadius: '8px',
                                                fontSize: '0.85rem',
                                                fontWeight: '700',
                                                minWidth: '110px',
                                                cursor: levelLocked ? 'not-allowed' : 'pointer',
                                                background: levelLocked ? 'rgba(255, 255, 255, 0.05)' : 'linear-gradient(135deg, #ae00ff 0%, #7a00cc 100%)',
                                                color: levelLocked ? '#555' : '#fff',
                                                border: 'none',
                                                transition: '0.2s',
                                                boxShadow: levelLocked ? 'none' : '0 4px 12px rgba(174, 0, 255, 0.3)'
                                            }}
                                        >
                                            {levelLocked ? 'LOCKED' : 'ENTER'}
                                        </button>
                                    </div>

                                    {/* Requirements Section */}
                                    <div>
                                        <h4 style={{ fontSize: '0.75rem', fontWeight: '600', color: '#8B8D91', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Required Items</h4>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                            {/* Map Ticket */}
                                            <div style={{ position: 'relative', width: '52px', height: '52px', background: '#2A3041', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                <div style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#1E2330', fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px', border: '1px solid #2A3041', color: hasMap ? '#4caf50' : '#ff4444', fontWeight: 'bold', zIndex: 2 }}>
                                                    {mapQty}/1
                                                </div>
                                                <div style={{ fontSize: '1.2rem', opacity: 0.8 }}>
                                                    <MapIcon size={28} color="#666" />
                                                </div>
                                            </div>

                                            {/* Silver Cost (if any, showing reward silver for now) */}
                                            <div style={{ position: 'relative', width: '52px', height: '52px', background: '#2A3041', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                <div style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#1E2330', fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px', border: '1px solid #2A3041', color: '#ffd700', fontWeight: 'bold', zIndex: 2 }}>
                                                    {dungeon.rewards.silver.toLocaleString()}
                                                </div>
                                                <div style={{ fontSize: '1.2rem', opacity: 0.8 }}>
                                                    <Coins size={28} color="#ffd700" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Rooms Section */}
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <h4 style={{ fontSize: '0.75rem', fontWeight: '600', color: '#8B8D91', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Dungeon Rooms</h4>
                                            <span style={{ fontSize: '0.6rem', color: '#4daafc', cursor: 'pointer' }}>{dungeon.waves} Nodes</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                                            {/* Wave Sequence (Minion 1-4) */}
                                            {dungeon.trashMobs?.map((mobId, idx) => {
                                                const mob = MONSTERS[tier]?.find(m => m.id === mobId);
                                                const scaling = 1 + (idx * 0.1);
                                                const powerStr = (scaling * 100).toFixed(0);
                                                return (
                                                    <div key={`${mobId}-${idx}`} title={`${mob?.name} (Lvl ${tier * 10}, ${powerStr}%)`} style={{ width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#2A3041', border: `1px solid rgba(255,255,255,${0.05 + (idx * 0.05)})`, flexShrink: 0, position: 'relative' }}>
                                                        <Skull size={20} color={idx === 3 ? '#ff6666' : '#ff4444'} />
                                                        <div style={{ position: 'absolute', bottom: '1px', right: '3px', fontSize: '0.45rem', fontWeight: '900', color: 'rgba(255,255,255,0.4)' }}>{idx + 1}</div>
                                                    </div>
                                                )
                                            })}
                                            {/* Boss (Final Wave) */}
                                            <div title={`BOSS: ${bossMob?.name} (150% POWER)`} style={{ width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,68,68,0.15)', border: '1px solid rgba(255,68,68,0.5)', flexShrink: 0, position: 'relative' }}>
                                                <Skull size={24} color="#ff0000" />
                                                <div style={{ position: 'absolute', bottom: '1px', right: '3px', fontSize: '0.45rem', fontWeight: '900', color: '#ff0000' }}>5</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Loot Section */}
                                    <div>
                                        <h4 style={{ fontSize: '0.75rem', fontWeight: '600', color: '#8B8D91', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Possible Loot</h4>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                            {lootItems.map((loot, idx) => {
                                                const item = resolveItem(loot.id);
                                                return (
                                                    <div key={`${loot.id}-${idx}`} title={`${loot.id.replace(/_/g, ' ')} (${(loot.chance * 100).toFixed(1)}%)`} style={{ width: '36px', height: '36px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #3D4255', background: '#2A3041', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <div style={{ width: '100%', height: '100%', background: '#1E2330', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                                            {item?.icon ? (
                                                                <img src={item.icon} alt={item.name} style={{ width: '130%', height: '130%', objectFit: 'contain' }} />
                                                            ) : (
                                                                loot.id.includes('CREST') ? <Star size={16} color="#666" /> : <Package size={16} color="#666" />
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
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
                        padding: '30px',
                        width: '360px',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '20px',
                        borderRadius: '24px',
                        border: '1px solid #ae00ff',
                        background: 'rgba(15, 20, 30, 0.95)',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
                    }}>
                        {(() => {
                            const dungeon = Object.values(DUNGEONS).find(d => d.tier === pendingTier);
                            const mapId = dungeon?.reqItem;
                            const availableMaps = inventory[mapId] || 0;

                            return (
                                <>
                                    <h3 style={{ margin: 0, color: '#fff', textAlign: 'center', fontSize: '1.2rem', fontWeight: '900', letterSpacing: '1px' }}>TOTAL RUNS T{pendingTier}</h3>

                                    <div style={{
                                        display: 'flex',
                                        gap: '10px',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        background: 'rgba(0,0,0,0.3)',
                                        padding: '12px',
                                        borderRadius: '16px',
                                        border: '1px solid rgba(174, 0, 255, 0.2)',
                                        width: '100%'
                                    }}>
                                        <button
                                            onClick={() => setRepeatCount(1)}
                                            style={{
                                                padding: '8px 12px',
                                                background: 'rgba(255,255,255,0.05)',
                                                color: '#888',
                                                borderRadius: '8px',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                fontSize: '0.7rem',
                                                fontWeight: 'bold',
                                                cursor: 'pointer',
                                                flexShrink: 0
                                            }}
                                        >
                                            MIN
                                        </button>

                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <button
                                                onClick={() => setRepeatCount(prev => Math.max(1, (parseInt(prev) || 0) - 1))}
                                                style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', color: '#fff', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 'bold', cursor: 'pointer' }}
                                            >
                                                -
                                            </button>

                                            <input
                                                type="number"
                                                value={repeatCount}
                                                onChange={(e) => setRepeatCount(Math.min(availableMaps, Math.max(1, parseInt(e.target.value) || 1)))}
                                                style={{
                                                    width: '60px',
                                                    padding: '5px',
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: '#fff',
                                                    textAlign: 'center',
                                                    fontWeight: 'bold',
                                                    fontSize: '1.4rem',
                                                    outline: 'none',
                                                    WebkitAppearance: 'none',
                                                    MozAppearance: 'textfield',
                                                    appearance: 'textfield'
                                                }}
                                            />

                                            <button
                                                onClick={() => setRepeatCount(prev => Math.min(availableMaps, (parseInt(prev) || 0) + 1))}
                                                style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', color: '#fff', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 'bold', cursor: 'pointer' }}
                                            >
                                                +
                                            </button>
                                        </div>

                                        <button
                                            onClick={() => setRepeatCount(availableMaps)}
                                            style={{
                                                padding: '8px 12px',
                                                background: 'rgba(174, 0, 255, 0.1)',
                                                color: '#ae00ff',
                                                borderRadius: '8px',
                                                border: '1px solid rgba(174, 0, 255, 0.3)',
                                                fontSize: '0.7rem',
                                                fontWeight: 'bold',
                                                cursor: 'pointer',
                                                flexShrink: 0
                                            }}
                                        >
                                            MAX
                                        </button>
                                    </div>

                                    <div style={{ padding: '10px', background: 'rgba(212, 175, 55, 0.05)', borderRadius: '12px', border: '1px solid rgba(212, 175, 55, 0.2)', width: '100%', textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.65rem', color: '#d4af37', textTransform: 'uppercase', fontWeight: '900', letterSpacing: '1px', marginBottom: '4px' }}>Estimated Time</div>
                                        <div style={{ fontSize: '1.2rem', color: '#fff', fontWeight: '900' }}>{formatDuration(calculateEstimatedTime(pendingTier, repeatCount))}</div>
                                        <div style={{ fontSize: '0.6rem', color: '#888', marginTop: '4px' }}>AVAILABLE MAPS: {availableMaps}</div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                                        <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', color: '#aaa', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 'bold', cursor: 'pointer' }}>CANCEL</button>
                                        <button onClick={confirmEnterDungeon} style={{ flex: 1, padding: '12px', background: 'linear-gradient(to bottom, #ae00ff, #8a00cc)', color: '#fff', borderRadius: '12px', border: 'none', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(174, 0, 255, 0.3)' }}>START</button>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>
            )
            }

            <DungeonHistoryModal
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
                history={history}
            />
        </div>
    );
};

export default DungeonPanel;
