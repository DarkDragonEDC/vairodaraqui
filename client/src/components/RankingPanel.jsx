import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Users, Star, Coins, Crown, ChevronDown } from 'lucide-react';

const CATEGORIES = {
    GENERAL: {
        label: 'GENERAL',
        options: [
            { key: 'LEVEL', label: 'Total Level' },
            { key: 'SILVER', label: 'Total Silver' }
        ]
    },
    COMBAT: {
        label: 'COMBAT',
        options: [
            { key: 'COMBAT', label: 'Combat Level' }
        ]
    },
    DUNGEON: {
        label: 'DUNGEON',
        options: [
            { key: 'DUNGEONEERING', label: 'Dungeoneering Level' }
        ]
    },
    GATHERING: {
        label: 'GATHERING',
        options: [
            { key: 'LUMBERJACK', label: 'Lumberjack' },
            { key: 'ORE_MINER', label: 'Mining' },
            { key: 'ANIMAL_SKINNER', label: 'Skinning' },
            { key: 'FIBER_HARVESTER', label: 'Harvesting' },
            { key: 'FISHING', label: 'Fishing' }
        ]
    },
    REFINING: {
        label: 'REFINING',
        options: [
            { key: 'PLANK_REFINER', label: 'Plank Refining' },
            { key: 'METAL_BAR_REFINER', label: 'Smelting' },
            { key: 'LEATHER_REFINER', label: 'Leather Refining' },
            { key: 'CLOTH_REFINER', label: 'Cloth Refining' }
        ]
    },
    CRAFTING: {
        label: 'CRAFTING',
        options: [
            { key: 'WARRIOR_CRAFTER', label: 'Warrior' },
            { key: 'HUNTER_CRAFTER', label: 'Hunter' },
            { key: 'MAGE_CRAFTER', label: 'Mage' },
            { key: 'COOKING', label: 'Cooking' }
        ]
    }
};

const RankingPanel = ({ socket, isMobile }) => {
    const [characters, setCharacters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [mainCategory, setMainCategory] = useState('GENERAL');
    const [subCategory, setSubCategory] = useState('LEVEL');

    useEffect(() => {
        if (!socket) return;

        // Determine which server-side leaderboard type to fetch
        let type = 'COMBAT';

        if (mainCategory === 'COMBAT') type = 'COMBAT';
        else if (mainCategory === 'DUNGEON') type = 'DUNGEON';
        else type = 'COMBAT';

        setLoading(true);
        socket.emit('get_leaderboard', type);

        const handleLeaderboard = (response) => {
            const data = Array.isArray(response) ? response : (response.data || []);
            setCharacters(data);
            setLoading(false);
        };

        socket.on('leaderboard_update', handleLeaderboard);
        return () => socket.off('leaderboard_update', handleLeaderboard);
    }, [socket, mainCategory]);

    const handleMainCategoryChange = (key) => {
        setMainCategory(key);
        setSubCategory(CATEGORIES[key].options[0].key);
    };

    const getSortedData = () => {
        if (!characters.length) return [];

        return [...characters].map(char => {
            const state = char.state || {};
            let value = 0;
            let subValue = 0;
            let label = 'LEVEL';

            if (mainCategory === 'COMBAT') {
                const skill = state.skills?.COMBAT || { level: 1, xp: 0 };
                value = skill.level;
                subValue = skill.xp;
                label = 'COMBAT LEVEL';
            } else if (mainCategory === 'DUNGEON') {
                const skill = state.skills?.DUNGEONEERING || { level: 1, xp: 0 };
                value = skill.level;
                subValue = skill.xp;
                label = 'DUNGEONEERING LEVEL';
            } else if (subCategory === 'SILVER') {
                value = state.silver || 0;
                label = 'SILVER';
            } else if (subCategory === 'LEVEL') {
                const skills = state.skills || {};
                value = Object.values(skills).reduce((acc, s) => acc + (s.level || 1), 0);
                subValue = Object.values(skills).reduce((acc, s) => acc + (s.xp || 0), 0);
                label = 'TOTAL LEVEL';
            } else {
                const skill = (state.skills || {})[subCategory];
                value = skill ? skill.level : 1;
                subValue = skill ? skill.xp : 0;
                label = 'SKILL LEVEL';
            }

            return { ...char, value, subValue, label };
        }).sort((a, b) => {
            if (b.value !== a.value) return b.value - a.value;
            return b.subValue - a.subValue;
        }).slice(0, 50);
    };

    const sortedData = getSortedData();

    return (
        <div className="glass-panel" style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '16px',
            background: 'rgba(15, 20, 30, 0.4)',
            minHeight: 0,
            overflow: 'hidden'
        }}>
            <div style={{ padding: isMobile ? '20px' : '30px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <div>
                        <h2 style={{ margin: 0, color: '#fff', fontSize: '1.4rem', fontWeight: '900', letterSpacing: '2px' }}>HALL OF FAME</h2>
                        <div style={{ fontSize: '0.6rem', color: '#555', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px' }}>The best of Albion Lands</div>
                    </div>
                    <div style={{ padding: '10px 20px', background: 'rgba(212, 175, 55, 0.05)', borderRadius: '8px', border: '1px solid rgba(212, 175, 55, 0.1)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Trophy size={18} color="#d4af37" />
                        <span style={{ color: '#d4af37', fontWeight: '900', fontSize: '0.8rem' }}>RANKINGS</span>
                    </div>
                </div>

                {/* Filtros */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.02)' }}>
                        {Object.keys(CATEGORIES).map(key => (
                            <button
                                key={key}
                                onClick={() => handleMainCategoryChange(key)}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    background: mainCategory === key ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
                                    color: mainCategory === key ? '#d4af37' : '#555',
                                    fontSize: '0.65rem',
                                    fontWeight: '900',
                                    cursor: 'pointer',
                                    transition: '0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                {key === 'COMBAT' && <Star size={12} />}
                                {key === 'DUNGEON' && <Crown size={12} />}
                                {CATEGORIES[key].label}
                            </button>
                        ))}
                    </div>

                    <div style={{ position: 'relative' }}>
                        <select
                            value={subCategory}
                            onChange={(e) => setSubCategory(e.target.value)}
                            style={{
                                appearance: 'none',
                                background: 'rgba(0,0,0,0.2)',
                                color: '#fff',
                                border: '1px solid rgba(255,255,255,0.05)',
                                padding: '8px 30px 8px 15px',
                                borderRadius: '8px',
                                fontSize: '0.7rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                outline: 'none'
                            }}
                        >
                            {CATEGORIES[mainCategory].options.map(opt => (
                                <option key={opt.key} value={opt.key}>{opt.label}</option>
                            ))}
                        </select>
                        <ChevronDown size={12} color="#555" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    </div>
                </div>

                {/* Lista */}
                <div className="scroll-container" style={{ flex: 1, paddingRight: '10px', overflowY: 'auto' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '100px 0', opacity: 0.3 }}>
                            <div className="loading-spinner" />
                            <p style={{ marginTop: '20px', fontSize: '0.8rem', fontWeight: 'bold', letterSpacing: '1px' }}>SEARCHING FOR LEGENDS...</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {sortedData.map((char, index) => (
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.02 }}
                                    key={char.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '15px 20px',
                                        background: index === 0 ? 'linear-gradient(90deg, rgba(212, 175, 55, 0.1) 0%, rgba(212, 175, 55, 0.02) 100%)' : 'rgba(255,255,255,0.01)',
                                        borderRadius: '10px',
                                        border: '1px solid',
                                        borderColor: index === 0 ? 'rgba(212, 175, 55, 0.2)' : 'rgba(255,255,255,0.02)',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}
                                >
                                    {/* Medalha / Numero */}
                                    <div style={{ width: '40px', fontSize: '1.2rem', fontWeight: '900', color: index === 0 ? '#d4af37' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : '#222' }}>
                                        {index === 0 ? <Crown size={20} /> : index + 1}
                                    </div>

                                    {/* Player Info */}
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.9rem', fontWeight: '900', color: index < 3 ? '#fff' : '#aaa' }}>{char.name}</div>
                                        <div style={{ fontSize: '0.55rem', color: '#555', fontWeight: 'bold', letterSpacing: '1px' }}>
                                            {char.label}
                                        </div>
                                    </div>

                                    {/* Valor */}
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '1.1rem', fontWeight: '900', color: index === 0 ? '#d4af37' : '#fff' }}>
                                            {subCategory === 'SILVER' ? char.value.toLocaleString() : char.value}
                                        </div>
                                        <div style={{ fontSize: '0.55rem', color: '#555', fontWeight: 'bold' }}>
                                            {char.label}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RankingPanel;
