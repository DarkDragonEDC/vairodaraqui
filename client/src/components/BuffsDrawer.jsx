import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FlaskConical, ChevronUp, Star, Coins, Sprout, Hammer, ArrowUpCircle, Clover, Diamond, Clock } from 'lucide-react';

const POTION_METADATA = {
    GLOBAL_XP: { label: 'Global XP', icon: <Star size={16} color="#d4af37" />, color: '#d4af37' },
    GATHER_XP: { label: 'Gathering XP', icon: <Sprout size={16} color="#4caf50" />, color: '#4caf50' },
    REFINE_XP: { label: 'Refining XP', icon: <ArrowUpCircle size={16} color="#2196f3" />, color: '#2196f3' },
    CRAFT_XP: { label: 'Crafting XP', icon: <Hammer size={16} color="#ff9800" />, color: '#ff9800' },
    GOLD: { label: 'Silver', icon: <Coins size={16} color="#ffd700" />, color: '#ffd700' },
    DROP: { label: 'Luck / Drop', icon: <Clover size={16} color="#4caf50" />, color: '#4caf50' },
    QUALITY: { label: 'Quality', icon: <Diamond size={16} color="#00bcd4" />, color: '#00bcd4' },
};

const BuffsDrawer = ({ gameState, isMobile }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [now, setNow] = useState(Date.now());
    const drawerRef = React.useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (drawerRef.current && !drawerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, [isOpen]);

    const activeBuffs = gameState?.state?.active_buffs || {};
    const stats = gameState?.calculatedStats || {};

    const formatTime = (ms) => {
        if (ms <= 0) return null;
        const secs = Math.floor(ms / 1000);
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}m ${s}s`;
    };

    return (
        <div style={{
            position: 'fixed',
            bottom: '104px', // Acima do ActivityWidget (30 + 64 + 10)
            right: isMobile ? '20px' : '30px',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end'
        }}
            ref={drawerRef}
        >
            {/* Drawer Content */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        style={{
                            width: '240px',
                            background: 'rgba(15, 20, 30, 0.95)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(212, 175, 55, 0.2)',
                            borderRadius: '12px',
                            padding: '12px',
                            marginBottom: '10px',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                        }}
                    >
                        <div style={{ fontSize: '0.65rem', color: '#888', fontWeight: '900', letterSpacing: '1px', marginBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                            ACTIVE BONUSES
                        </div>

                        {Object.entries(POTION_METADATA).map(([key, meta]) => {
                            const rawActive = activeBuffs[key];
                            const active = (rawActive && rawActive.expiresAt > now) ? rawActive : null;
                            const timeRemaining = active ? active.expiresAt - now : 0;

                            // Pegar valor do bônus total para o badge principal
                            let totalBonus = 0;
                            if (key === 'GLOBAL_XP') totalBonus = stats.globals?.xpYield || 0;
                            else if (key === 'GOLD') totalBonus = stats.globals?.silverYield || 0;
                            else if (key === 'DROP') totalBonus = stats.globals?.dropRate || 0;
                            else if (key === 'QUALITY') totalBonus = stats.globals?.qualityChance || 0;
                            else if (key === 'GATHER_XP') totalBonus = stats.xpBonus?.GATHERING || 0;
                            else if (key === 'REFINE_XP') totalBonus = stats.xpBonus?.REFINING || 0;
                            else if (key === 'CRAFT_XP') totalBonus = stats.xpBonus?.CRAFTING || 0;

                            // Calcular bônus específico da poção (se houver)
                            const potionBonusPercent = active ? Math.round(active.value * 100) : 0;

                            // Calcular bônus base (INT ou outros)
                            // XP e Silver agora usam 0.5% por INT
                            let baseBonus = totalBonus - potionBonusPercent;

                            // Visual Fix: If Base Bonus is effectively 0 (or close to it), show 0 to avoid "-1%" noise
                            if (Math.abs(baseBonus) < 1) baseBonus = 0;
                            // Also if Total is 0 but Potion is active, it means stats aren't synced yet.
                            // We can clamp to avoid negative numbers if we know INT can't be negative.
                            if (baseBonus < 0) baseBonus = 0;

                            if (key === 'GLOBAL_XP' || key === 'GOLD') {
                                // For these, we know INT is the source
                            }

                            return (
                                <div key={key} style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    padding: '5px 8px',
                                    background: (active || totalBonus > 0) ? 'rgba(212,175,55,0.05)' : 'rgba(255,255,255,0.02)',
                                    borderRadius: '6px',
                                    border: `1px solid ${active ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.05)'}`,
                                    opacity: (active || totalBonus > 0) ? 1 : 0.4,
                                    transition: 'all 0.2s'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '18px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            {React.cloneElement(meta.icon, { size: 14 })}
                                            <span style={{ fontSize: '0.7rem', color: '#fff', fontWeight: '800' }}>{meta.label}</span>
                                        </div>
                                        <div style={{ color: (active || totalBonus > 0) ? meta.color : '#666', fontWeight: '900', fontSize: '0.75rem' }}>
                                            +{totalBonus.toFixed(0)}%
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '12px' }}>
                                        <div style={{ fontSize: '0.55rem', color: '#555', fontWeight: 'bold' }}>
                                            {active && (
                                                <>POTION: <span style={{ color: '#d4af37' }}>+{potionBonusPercent}%</span> | </>
                                            )}
                                            {/* INT ou Base Bonus. Se for muito óbvio que é só INT, talvez nem precise do label, mas vamos manter o padrão. */}
                                            INT: +{baseBonus.toFixed(0)}%
                                        </div>
                                        {active && (
                                            <span style={{ fontSize: '0.55rem', color: '#d4af37', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                <Clock size={8} /> {formatTime(timeRemaining)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toggle Button */}
            <motion.button
                whileHover={{ scale: 1.1, backgroundColor: 'rgba(212, 175, 55, 0.15)' }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'rgba(15, 20, 30, 0.95)',
                    opacity: 0.5,
                    border: `1px solid ${isOpen ? '#d4af37' : 'rgba(212,175,55,0.3)'}`,
                    color: '#d4af37',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: isOpen ? '0 0 20px rgba(212, 175, 55, 0.3)' : '0 8px 32px rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(10px)',
                    position: 'relative',
                    transition: 'border 0.3s'
                }}
            >
                <FlaskConical size={20} strokeWidth={2} />

                {/* Active Indicator Dot */}
                {Object.keys(activeBuffs).length > 0 && (
                    <motion.div
                        animate={{ scale: [1, 1.2, 1], opacity: [1, 0.6, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        style={{
                            position: 'absolute',
                            top: '8px',
                            right: '10px',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: '#d4af37',
                            border: '1.5px solid #0f141e'
                        }}
                    />
                )}
            </motion.button>
        </div>
    );
};

export default BuffsDrawer;
