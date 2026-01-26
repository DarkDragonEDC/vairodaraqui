import React, { useState } from 'react';
import { Package, Star, Clock, X, AlertCircle, Sword, Coins, Zap, Shield, Heart, Axe, Pickaxe, Scissors, Anchor, Apple, Box, Trophy, Hammer, Utensils, Anvil } from 'lucide-react';
import { resolveItem, getTierColor } from '@shared/items';
import { motion, AnimatePresence } from 'framer-motion';

const OfflineGainsModal = ({ isOpen, data, onClose }) => {

    const SKILL_ICONS = {
        WOODCUTTING: <Axe size={16} />,
        MINING: <Pickaxe size={16} />,
        HARVESTING: <Scissors size={16} />,
        FISHING: <Anchor size={16} />,
        ALCHEMY: <Zap size={16} />,
        BLACKSMITHING: <Hammer size={16} />,
        COOKING: <Utensils size={16} />,
        GEAR_CRAFTING: <Anvil size={16} />,
        COMBAT: <Sword size={16} />,
        DUNGEONEERING: <Shield size={16} />
    };

    const SKILL_NAMES = {
        WOODCUTTING: 'Woodcutting',
        MINING: 'Mining',
        HARVESTING: 'Harvesting',
        FISHING: 'Fishing',
        ALCHEMY: 'Alchemy',
        BLACKSMITHING: 'Blacksmithing',
        COOKING: 'Cooking',
        GEAR_CRAFTING: 'Gear Crafting',
        COMBAT: 'Combat',
        DUNGEONEERING: 'Dungeoneering'
    };

    const [showFullNumbers, setShowFullNumbers] = useState(false);
    if (!isOpen || !data) return null;

    const { totalTime, elapsedTime, itemsGained, xpGained, combat } = data;

    // Format seconds to HH:mm:ss
    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const formatValue = (num) => {
        if (num >= 1000000000) return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
        if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
        return num.toLocaleString();
    };

    const formatSilver = formatValue;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0, 0, 0, 0.85)',
                    backdropFilter: 'blur(10px)',
                    zIndex: 2000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}
            >
                <motion.div
                    initial={{ scale: 0.9, y: 30, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.9, y: 30, opacity: 0 }}
                    style={{
                        background: '#12141a',
                        border: '1px solid rgba(212, 175, 55, 0.3)',
                        borderRadius: '24px',
                        width: '100%',
                        maxWidth: '420px',
                        maxHeight: '90vh',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(212, 175, 55, 0.1)',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        position: 'relative'
                    }}
                >
                    {/* Header with Background Decoration */}
                    <div style={{
                        padding: '15px 15px 8px',
                        textAlign: 'center',
                        position: 'relative',
                        background: 'linear-gradient(180deg, rgba(212, 175, 55, 0.08) 0%, transparent 100%)',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.03)'
                    }}>
                        <div style={{
                            position: 'absolute',
                            top: -20, left: '50%', transform: 'translateX(-50%)',
                            width: '80px', height: '80px',
                            background: 'radial-gradient(circle, rgba(212, 175, 55, 0.15) 0%, transparent 70%)',
                            zIndex: 0
                        }}></div>

                        <h2 style={{
                            margin: 0,
                            fontSize: '1rem',
                            fontWeight: '900',
                            color: '#fff',
                            letterSpacing: '2px',
                            textTransform: 'uppercase',
                            position: 'relative',
                            zIndex: 1
                        }}>
                            OFFLINE <span style={{ color: '#d4af37' }}>PROGRESS</span>
                        </h2>

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            marginTop: '4px',
                            color: 'rgba(255, 255, 255, 0.35)',
                            fontSize: '0.7rem',
                            fontWeight: '500'
                        }}>
                            <Clock size={12} color="#d4af37" />
                            <span>Away for <strong style={{ color: '#fff' }}>{formatTime(elapsedTime || totalTime || 0)}</strong></span>
                        </div>
                    </div>

                    {/* Scrollable Body */}
                    <div className="scroll-container" style={{
                        padding: '12px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '15px',
                        flex: 1,
                        overflowY: 'auto'
                    }}>

                        {/* Combat Summary - Visual Overhaul */}
                        {combat && (
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.02)',
                                padding: '15px',
                                borderRadius: '16px',
                                border: '1px solid rgba(255, 68, 68, 0.15)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px',
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                                {/* Subtle Red Glow for Combat */}
                                <div style={{ position: 'absolute', top: 0, right: 0, width: '100px', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255, 68, 68, 0.03))' }}></div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                                    <h3 style={{
                                        margin: 0,
                                        fontSize: '0.65rem',
                                        color: '#ff6b6b',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '1px',
                                        fontWeight: '900'
                                    }}>
                                        <Sword size={12} /> Combat
                                    </h3>
                                    {combat.monsterName && (
                                        <span style={{ fontSize: '0.55rem', background: 'rgba(255, 68, 68, 0.1)', color: '#ff6b6b', padding: '1px 6px', borderRadius: '4px', fontWeight: 'bold', border: '1px solid rgba(255, 68, 68, 0.1)' }}>
                                            {combat.monsterName.toUpperCase()}
                                        </span>
                                    )}
                                </div>

                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-around',
                                    background: 'rgba(0,0,0,0.15)',
                                    padding: '6px',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(255, 255, 255, 0.03)'
                                }}>
                                    <div
                                        onClick={() => setShowFullNumbers(!showFullNumbers)}
                                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}
                                    >
                                        <span style={{ fontSize: '0.5rem', color: '#666', textTransform: 'uppercase', fontWeight: '800' }}>Kills</span>
                                        <span style={{ fontSize: '0.9rem', fontWeight: '900', color: '#fff' }}>
                                            {showFullNumbers ? (combat.kills || 0).toLocaleString() : formatValue(combat.kills || 0)}
                                        </span>
                                    </div>
                                    <div style={{ width: '1px', background: 'rgba(255,255,255,0.05)', height: '15px', alignSelf: 'center' }}></div>
                                    <div
                                        onClick={() => setShowFullNumbers(!showFullNumbers)}
                                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}
                                    >
                                        <span style={{ fontSize: '0.5rem', color: '#666', textTransform: 'uppercase', fontWeight: '800' }}>Silver</span>
                                        <span style={{ fontSize: '0.9rem', fontWeight: '900', color: '#ffca28' }}>
                                            {showFullNumbers ? (combat.silverGained || 0).toLocaleString() : formatValue(combat.silverGained || 0)}
                                        </span>
                                    </div>
                                    <div style={{ width: '1px', background: 'rgba(255,255,255,0.05)', height: '15px', alignSelf: 'center' }}></div>
                                    <div
                                        onClick={() => setShowFullNumbers(!showFullNumbers)}
                                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}
                                    >
                                        <span style={{ fontSize: '0.5rem', color: '#666', textTransform: 'uppercase', fontWeight: '800' }}>Healing</span>
                                        <span style={{ fontSize: '0.9rem', fontWeight: '900', color: '#49cc90' }}>
                                            {showFullNumbers ? (combat.foodConsumed || 0).toLocaleString() : formatValue(combat.foodConsumed || 0)}
                                        </span>
                                    </div>
                                </div>

                                {combat.died && (
                                    <div style={{
                                        marginTop: '5px',
                                        padding: '8px 12px',
                                        background: 'rgba(255, 68, 68, 0.1)',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        color: '#ff4444',
                                        fontSize: '0.75rem',
                                        fontWeight: 'bold',
                                        border: '1px solid rgba(255, 68, 68, 0.2)'
                                    }}>
                                        <AlertCircle size={14} />
                                        <span>Training ended early because you were defeated.</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Experience Section */}
                        {xpGained && Object.keys(xpGained).length > 0 && (
                            <div>
                                <h3 style={{
                                    margin: '0 0 10px 0',
                                    fontSize: '0.65rem',
                                    color: 'rgba(255,255,255,0.3)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px',
                                    fontWeight: '900'
                                }}>
                                    <Star size={12} color="#d4af37" /> Experience
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                                    {Object.entries(xpGained).map(([skill, amount]) => (
                                        <div
                                            key={skill}
                                            onClick={() => setShowFullNumbers(!showFullNumbers)}
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                background: 'rgba(255, 255, 255, 0.02)',
                                                padding: '12px 15px',
                                                borderRadius: '12px',
                                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                                transition: '0.2s',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ opacity: 0.5, color: '#d4af37' }}>
                                                    {SKILL_ICONS[skill] || <Star size={14} />}
                                                </div>
                                                <span style={{ fontWeight: '700', color: '#fff', fontSize: '0.85rem' }}>
                                                    {SKILL_NAMES[skill] || skill}
                                                </span>
                                            </div>
                                            <span style={{ color: '#4caf50', fontWeight: '900', fontSize: '0.85rem' }}>
                                                +{showFullNumbers ? amount.toLocaleString() : formatValue(amount)} <span style={{ fontSize: '0.55rem', opacity: 0.5 }}>XP</span>
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Items Section */}
                        {itemsGained && Object.keys(itemsGained).length > 0 ? (
                            <div>
                                <h3 style={{
                                    margin: '0 0 10px 0',
                                    fontSize: '0.65rem',
                                    color: 'rgba(255,255,255,0.3)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px',
                                    fontWeight: '900'
                                }}>
                                    <Package size={12} color="#d4af37" /> Resources
                                </h3>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                                    gap: '10px'
                                }}>
                                    {Object.entries(itemsGained).map(([itemId, amount]) => {
                                        const item = resolveItem(itemId);
                                        const tierColor = item ? getTierColor(item.tier) : 'rgba(255,255,255,0.1)';

                                        return (
                                            <div key={itemId} style={{
                                                background: 'rgba(0, 0, 0, 0.3)',
                                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                                borderRadius: '16px',
                                                padding: '15px 10px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: '8px',
                                                position: 'relative'
                                            }}>
                                                <div style={{
                                                    width: '40px',
                                                    height: '40px',
                                                    background: 'rgba(255, 255, 255, 0.02)',
                                                    borderRadius: '10px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    border: `1px solid ${tierColor}33`,
                                                    overflow: 'hidden'
                                                }}>
                                                    {item?.icon ? (
                                                        <img src={item.icon} style={{ width: '130%', height: '130%', objectFit: 'contain' }} alt={item.name} />
                                                    ) : (
                                                        <Package size={20} color="#666" style={{ opacity: 0.8 }} />
                                                    )}
                                                </div>

                                                <div style={{
                                                    position: 'absolute',
                                                    top: '5px',
                                                    right: '5px',
                                                    background: '#d4af37',
                                                    color: '#000',
                                                    fontSize: '0.6rem',
                                                    fontWeight: '900',
                                                    padding: '1px 5px',
                                                    borderRadius: '6px',
                                                    boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
                                                }}>
                                                    x{amount}
                                                </div>

                                                <div style={{ textAlign: 'center' }}>
                                                    <div style={{ fontSize: '0.6rem', color: '#666', fontWeight: '900', marginBottom: '1px' }}>T{item?.tier || '?'}</div>
                                                    <div style={{
                                                        fontSize: '0.65rem',
                                                        color: '#aaa',
                                                        fontWeight: 'bold',
                                                        width: '100%',
                                                        maxWidth: '70px',
                                                        overflow: 'hidden',
                                                        whiteSpace: 'nowrap',
                                                        textOverflow: 'ellipsis'
                                                    }}>
                                                        {item?.name || itemId}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            (!xpGained || Object.keys(xpGained).length === 0) && (
                                <div style={{
                                    textAlign: 'center',
                                    color: 'rgba(255,255,255,0.2)',
                                    padding: '40px 20px',
                                    background: 'rgba(0,0,0,0.1)',
                                    borderRadius: '16px',
                                    border: '1px dashed rgba(255,255,255,0.05)'
                                }}>
                                    <AlertCircle size={32} style={{ marginBottom: '10px', opacity: 0.5, margin: '0 auto' }} />
                                    <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '500' }}>No progress made during this period.</p>
                                </div>
                            )
                        )}

                    </div>

                    {/* Footer / Action */}
                    <div style={{ padding: '12px 20px', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255, 255, 255, 0.03)' }}>
                        <button
                            onClick={onClose}
                            style={{
                                width: '100%',
                                background: 'linear-gradient(135deg, #d4af37 0%, #8a6d0a 100%)',
                                border: 'none',
                                padding: '10px',
                                borderRadius: '12px',
                                color: '#000',
                                fontWeight: '950',
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                boxShadow: '0 8px 30px rgba(212, 175, 55, 0.2)',
                                textTransform: 'uppercase',
                                letterSpacing: '2px',
                                transition: '0.3s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            CONFIRM
                        </button>
                    </div>

                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default OfflineGainsModal;
