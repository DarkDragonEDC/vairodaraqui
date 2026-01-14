import React, { useState } from 'react';
import {
    Package, User, Pickaxe, Hammer, Sword,
    ChevronDown, ChevronRight, Coins, Castle,
    Trophy, Tag, Zap, Box, Axe, Shield, Users
} from 'lucide-react';

const Sidebar = ({ gameState, activeTab, setActiveTab, activeCategory, setActiveCategory, isMobile, isOpen, onClose, onSwitchCharacter }) => {
    const [expanded, setExpanded] = useState({
        gathering: true,
        refining: false,
        crafting: false,
        combat: false
    });

    const toggleExpand = (id) => {
        setExpanded(prev => ({
            gathering: false,
            refining: false,
            crafting: false,
            combat: false,
            [id]: !prev[id]
        }));
    };

    const skills = gameState?.state?.skills || {};
    const silver = gameState?.state?.silver || 0;

    const skillMap = {
        'WOOD': 'LUMBERJACK',
        'ORE': 'ORE_MINER',
        'HIDE': 'ANIMAL_SKINNER',
        'FIBER': 'FIBER_HARVESTER',
        'FISH': 'FISHING',
        'PLANK': 'PLANK_REFINER',
        'BAR': 'METAL_BAR_REFINER',
        'LEATHER': 'LEATHER_REFINER',
        'CLOTH': 'CLOTH_REFINER',
        'WARRIORS_FORGE': 'WARRIOR_CRAFTER',
        'HUNTERS_LODGE': 'HUNTER_CRAFTER',
        'MAGES_TOWER': 'MAGE_CRAFTER',
        'COOKING_STATION': 'COOKING'
    };

    const SkillInfo = ({ skillKey }) => {
        const skill = skills[skillKey] || { level: 1, xp: 0 };
        const level = skill.level || 1;
        const xp = skill.xp || 0;
        const nextLevelXp = Math.floor(100 * Math.pow(1.15, level - 1));
        const progress = Math.min(100, (xp / nextLevelXp) * 100);
        const remainingXp = nextLevelXp - xp;

        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0px' }}>
                <div style={{ fontSize: '0.6rem', fontWeight: '900', color: '#d4af37' }}>
                    Lv {level} <span style={{ color: '#666', fontSize: '0.5rem' }}>({Math.floor(progress)}%)</span>
                </div>
                <div style={{ width: '40px', height: '2px', background: 'rgba(255,255,255,0.05)', borderRadius: '1px', overflow: 'hidden', marginTop: '3px' }}>
                    <div style={{ width: `${progress}%`, height: '100%', background: '#d4af37' }} />
                </div>
            </div>
        );
    };

    const menuItems = [
        { id: 'profile', label: 'Perfil', icon: <User size={18} /> },
        { id: 'inventory', label: 'Inventário', icon: <Package size={18} /> },
        {
            id: 'gathering',
            label: 'Coleta',
            icon: <Pickaxe size={18} />,
            children: [
                { id: 'WOOD', label: 'Lenhador', skill: 'LUMBERJACK' },
                { id: 'ORE', label: 'Mineração', skill: 'ORE_MINER' },
                { id: 'HIDE', label: 'Esfolamento', skill: 'ANIMAL_SKINNER' },
                { id: 'FIBER', label: 'Tecelagem', skill: 'FIBER_HARVESTER' },
                { id: 'FISH', label: 'Pescaria', skill: 'FISHING' },
            ]
        },
        {
            id: 'refining',
            label: 'Refino',
            icon: <Box size={18} />,
            children: [
                { id: 'PLANK', label: 'Serraria', skill: 'PLANK_REFINER' },
                { id: 'BAR', label: 'Fundição', skill: 'METAL_BAR_REFINER' },
                { id: 'LEATHER', label: 'Curtume', skill: 'LEATHER_REFINER' },
                { id: 'CLOTH', label: 'Tear', skill: 'CLOTH_REFINER' },
            ]
        },
        {
            id: 'crafting',
            label: 'Forja',
            icon: <Hammer size={18} />,
            children: [
                { id: 'WARRIORS_FORGE', label: 'Forja de Guerreiro', skill: 'WARRIOR_CRAFTER' },
                { id: 'HUNTERS_LODGE', label: 'Cabana de Caçador', skill: 'HUNTER_CRAFTER' },
                { id: 'MAGES_TOWER', label: 'Torre de Mago', skill: 'MAGE_CRAFTER' },
                { id: 'COOKING_STATION', label: 'Cozinha', skill: 'COOKING' },
            ]
        },
        { id: 'combat', label: 'Combate', icon: <Sword size={18} />, skill: 'COMBAT' },
        { id: 'dungeon', label: 'Dungeons', icon: <Castle size={18} />, skill: 'DUNGEONEERING' },
        { id: 'ranking', label: 'Ranking', icon: <Trophy size={18} /> },
    ];

    return (
        <div
            className="glass-panel"
            style={{
                width: isMobile ? '65vw' : '250px',
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                position: isMobile ? 'fixed' : 'sticky',
                top: 0,
                left: (isMobile && !isOpen) ? '-100%' : 0,
                zIndex: 999,
                transition: '0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                borderRight: '1px solid var(--border)',
                background: '#0d1117',
            }}
        >
            {isMobile && (
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '15px',
                        right: '15px',
                        color: '#555',
                        background: 'transparent',
                        border: 'none',
                        zIndex: 1001
                    }}
                >
                    <ChevronRight size={20} />
                </button>
            )}
            <div style={{
                margin: '20px 10px 5px 10px',
                padding: '8px',
                background: 'rgba(212, 175, 55, 0.03)',
                border: '1px solid rgba(212, 175, 55, 0.1)',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
            }}>
                <Coins size={14} color="#d4af37" />
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#d4af37', fontFamily: 'monospace' }}>
                    {silver.toLocaleString()}
                </span>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '5px',
                padding: '0 10px',
                marginBottom: '10px'
            }}>
                {[
                    { id: 'profile', label: 'PERFIL', icon: <User size={14} /> },
                    { id: 'inventory', label: 'MOCHILA', icon: <Package size={14} /> },
                    { id: 'market', label: 'MERCADO', icon: <Tag size={14} /> }
                ].map(item => (
                    <button
                        key={item.id}
                        onClick={() => {
                            setActiveTab(item.id);
                            if (isMobile) onClose();
                        }}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            padding: '6px 0',
                            borderRadius: '6px',
                            border: '1px solid',
                            borderColor: activeTab === item.id ? 'var(--border-active)' : 'transparent',
                            background: activeTab === item.id ? 'var(--accent-soft)' : 'rgba(255,255,255,0.01)',
                            color: activeTab === item.id ? '#d4af37' : '#666',
                        }}
                    >
                        {item.icon}
                        <span style={{ fontSize: '0.6rem', fontWeight: '900', letterSpacing: '0.5px' }}>{item.label}</span>
                    </button>
                ))}
            </div>

            <div className="scroll-container" style={{ padding: '2px 8px', flex: 1 }}>
                {menuItems.slice(2).map(item => (
                    <div key={item.id} style={{ marginBottom: '1px' }}>
                        <button
                            onClick={() => {
                                if (item.children) {
                                    toggleExpand(item.id);
                                } else {
                                    setActiveTab(item.id);
                                    if (isMobile) onClose();
                                }
                            }}
                            style={{
                                width: '100%',
                                padding: '8px 10px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: activeTab === item.id ? 'var(--accent-soft)' : 'transparent',
                                borderRadius: '6px',
                                color: activeTab === item.id ? '#fff' : '#666',
                                textAlign: 'left'
                            }}
                        >
                            <span style={{ color: activeTab === item.id ? '#d4af37' : '#444' }}>{item.icon}</span>
                            <span style={{ flex: 1, fontWeight: activeTab === item.id ? '700' : '400', fontSize: '0.95rem', letterSpacing: '0.3px' }}>{item.label}</span>

                            {item.skill && !item.children && <SkillInfo skillKey={item.skill} />}
                            {item.children && (
                                <span style={{ opacity: 0.3 }}>
                                    {expanded[item.id] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                </span>
                            )}
                        </button>

                        {item.children && expanded[item.id] && (
                            <div style={{ paddingLeft: '15px', marginTop: '1px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                {item.children.map(child => (
                                    <button
                                        key={child.id}
                                        onClick={() => {
                                            setActiveTab(item.id);
                                            setActiveCategory(child.id);
                                            if (isMobile) onClose();
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '5px 8px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            background: (activeTab === item.id && activeCategory === child.id) ? 'rgba(255, 255, 255, 0.03)' : 'transparent',
                                            borderRadius: '4px',
                                            color: (activeTab === item.id && activeCategory === child.id) ? '#d4af37' : '#555',
                                            fontSize: '0.9rem'
                                        }}
                                    >
                                        <span style={{ fontWeight: (activeTab === item.id && activeCategory === child.id) ? '600' : '400' }}>{child.label}</span>
                                        {child.skill && <SkillInfo skillKey={child.skill} />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Footer Buttons */}
            <div style={{ padding: '15px 10px', borderTop: '1px solid var(--border)' }}>
                <button
                    onClick={onSwitchCharacter}
                    style={{
                        width: '100%',
                        padding: '10px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        borderRadius: '6px',
                        color: '#888',
                        fontSize: '0.7rem',
                        fontWeight: '900',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        transition: '0.2s'
                    }}
                >
                    <Users size={14} />
                    TROCAR PERSONAGEM
                </button>
                <div style={{ textAlign: 'center', fontSize: '0.55rem', color: '#333', marginTop: '10px', fontWeight: 'bold' }}>
                    v2.0.1
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
