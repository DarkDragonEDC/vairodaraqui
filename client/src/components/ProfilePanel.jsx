import React, { useMemo, useState } from 'react';
import EquipmentSelectModal from './EquipmentSelectModal';
import { motion } from 'framer-motion';
import {
    Heart, Shield, Sword, Zap,
    User, Target, Star, Layers,
    Axe, Pickaxe, Scissors, Anchor, Apple, Info, ShoppingBag
} from 'lucide-react';
import { resolveItem, getTierColor } from '@shared/items';
import StatBreakdownModal from './StatBreakdownModal';

const ProfilePanel = ({ gameState, session, socket, onShowInfo, isMobile }) => {
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [infoModal, setInfoModal] = useState(null);
    const [breakdownModal, setBreakdownModal] = useState(null);

    const handleEquip = (itemId) => {
        socket.emit('equip_item', { itemId });
    };

    const handleUnequip = (slot) => {
        socket.emit('unequip_item', { slot });
    };

    const name = gameState?.name || 'Explorer';
    const state = gameState?.state || {};
    const { skills = {}, silver = 0, health = 100, maxHealth = 100, equipment = {} } = state;
    const charStats = state.stats || { str: 0, agi: 0, int: 0 };

    const calculatedStats = useMemo(() => {
        // Base stats iniciam em 0
        let str = 0;
        let agi = 0;
        let int = 0;

        // Helper para pegar nível de forma segura
        const getLvl = (key) => (skills[key]?.level || 1);

        // STR: Warrior Class (Mining, Smelting, Warrior Crafting)
        str += getLvl('ORE_MINER');
        str += getLvl('METAL_BAR_REFINER');
        str += getLvl('WARRIOR_CRAFTER');
        str += getLvl('COOKING');
        str += getLvl('FISHING');

        // AGI: Hunter Class (Skinning, Tanning, Hunter Crafting)
        agi += getLvl('ANIMAL_SKINNER');
        agi += getLvl('LEATHER_REFINER');
        agi += getLvl('HUNTER_CRAFTER');
        agi += getLvl('LUMBERJACK');
        agi += getLvl('PLANK_REFINER');

        // INT: Mage Class (Harvesting, Woodcutting, Weaving, Woodworking, Mage Crafting, Herbalism, Distillation, Alchemy)
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

        // Gear Bonuses
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

        return { str, agi, int };
    }, [skills, equipment]);

    const stats = useMemo(() => {
        // Fallback para cálculo local (útil para updates otimistas antes do servidor responder)
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

        const totalSpeed = weaponSpeed + gearSpeedBonus + (calculatedStats.agi * 2);
        const finalAttackSpeed = Math.max(200, 2000 - totalSpeed);

        // Helper para ferramentas
        const getToolEff = (toolSlot) => {
            const tool = equipment[toolSlot];
            if (!tool) return 0;
            const fresh = resolveItem(tool.id || tool.item_id);
            return fresh?.stats?.efficiency || 0;
        };

        const globalEff = Object.values(equipment).reduce((acc, item) => {
            if (!item) return acc;
            const fresh = resolveItem(item.id || item.item_id);
            const statsToUse = fresh?.stats || item.stats;
            const effVal = typeof statsToUse?.efficiency === 'object' ? (statsToUse.efficiency.GLOBAL || 0) : 0;
            return acc + effVal;
        }, 0);

        return {
            hp: health,
            maxHp: 100 + (calculatedStats.str * 10) + gearHP,
            damage: Math.floor((5 + (calculatedStats.str * 1) + (calculatedStats.agi * 1) + (calculatedStats.int * 1) + gearDamage) * (1 + gearDmgBonus)),
            defense: gearDefense,
            attackSpeed: finalAttackSpeed,
            str: calculatedStats.str,
            agi: calculatedStats.agi,
            int: calculatedStats.int,
            efficiency: {
                WOOD: (skills.LUMBERJACK?.level || 1) * 0.3 + getToolEff('tool_axe') + globalEff,
                ORE: (skills.ORE_MINER?.level || 1) * 0.3 + getToolEff('tool_pickaxe') + globalEff,
                HIDE: (skills.ANIMAL_SKINNER?.level || 1) * 0.3 + getToolEff('tool_knife') + globalEff,
                FIBER: (skills.FIBER_HARVESTER?.level || 1) * 0.3 + getToolEff('tool_sickle') + globalEff,
                HERB: (skills.HERBALISM?.level || 1) * 0.3 + globalEff, // No tool for now? Or maybe sickle?
                FISH: (skills.FISHING?.level || 1) * 0.3 + getToolEff('tool_rod') + globalEff,
                PLANK: (skills.PLANK_REFINER?.level || 1) * 0.3 + globalEff,
                METAL: (skills.METAL_BAR_REFINER?.level || 1) * 0.3 + globalEff,
                LEATHER: (skills.LEATHER_REFINER?.level || 1) * 0.3 + globalEff,
                CLOTH: (skills.CLOTH_REFINER?.level || 1) * 0.3 + globalEff,
                EXTRACT: (skills.DISTILLATION?.level || 1) * 0.3 + globalEff,
                WARRIOR: (skills.WARRIOR_CRAFTER?.level || 1) * 0.3 + globalEff,
                HUNTER: (skills.HUNTER_CRAFTER?.level || 1) * 0.3 + globalEff,
                MAGE: (skills.MAGE_CRAFTER?.level || 1) * 0.3 + globalEff,
                ALCHEMY: (skills.ALCHEMY?.level || 1) * 0.3 + globalEff,
                TOOLS: (skills.TOOL_CRAFTER?.level || 1) * 0.3 + globalEff,
                COOKING: (skills.COOKING?.level || 1) * 0.3 + globalEff,
                GLOBAL: globalEff
            },
            silverMultiplier: 1.0 + (calculatedStats.int * 0.005)
        };
    }, [gameState?.calculatedStats, calculatedStats, health, skills, equipment]);

    const avgIP = useMemo(() => {
        const combatSlots = ['head', 'chest', 'shoes', 'gloves', 'cape', 'mainHand', 'offHand'];
        let totalIP = 0;
        let count = 0;

        combatSlots.forEach(slot => {
            const item = equipment[slot];
            if (item) {
                totalIP += item.ip || 0;
                count++;
            }
        });

        return count > 0 ? Math.floor(totalIP / count) : 0;
    }, [equipment]);

    const EquipmentSlot = ({ slot, icon, label, item: rawItem, onClick, onShowInfo }) => {
        // Resolve item to ensure we have latest stats and rarity color (even for Normal items if logic changes, but mostly for _Q items)
        const item = rawItem ? { ...rawItem, ...resolveItem(rawItem.id || rawItem.item_id) } : null;

        const tierColor = item ? '#666' : 'rgba(255,255,255,0.05)';

        // Logic: STRICTLY use rarity color. Tier color does NOT affect border.
        // Normal items (Quality 0) will use their defined rarity color (usually White/#fff).
        const borderColor = item && item.rarityColor ? item.rarityColor : 'rgba(255,255,255,0.1)';
        const hasQuality = item && item.quality > 0;

        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <div style={{
                    width: '64px',
                    height: '64px',
                    background: 'rgba(0,0,0,0.3)',
                    border: `2px solid ${borderColor}`,
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: '0.2s',
                    boxShadow: hasQuality ? `0 0 10px ${borderColor}66` : 'none'
                }}
                    onClick={onClick}
                >
                    {item ? (
                        <div style={{ color: tierColor, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.6rem', fontWeight: 'bold', position: 'absolute', top: 2, left: 4 }}>T{item.tier}</span>
                            {/* Quantidade (especialmente para food) */}
                            {item.amount > 1 && (
                                <span style={{
                                    position: 'absolute',
                                    bottom: 2,
                                    left: 4,
                                    fontSize: '0.7rem',
                                    color: '#fff',
                                    fontWeight: '900',
                                    textShadow: '0 1px 3px rgba(0,0,0,1)'
                                }}>
                                    {item.amount}
                                </span>
                            )}
                            {/* Se tiver qualidade, mostrar um pequeno indicador (estrela ou ponto) */}
                            {hasQuality && (
                                <div style={{ position: 'absolute', top: 2, right: 2 }}>
                                    <Star size={10} color={borderColor} fill={borderColor} />
                                </div>
                            )}
                            {/* Botão de Info (i) */}
                            <div
                                style={{
                                    position: 'absolute',
                                    bottom: 2,
                                    right: 4,
                                    opacity: 0.6,
                                    cursor: 'help'
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onShowInfo(item);
                                }}
                            >
                                <Info size={12} color="#fff" />
                            </div>
                            <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {item.icon ? (
                                    <img src={item.icon} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="" />
                                ) : (
                                    <PackageIcon type={item.type} size={24} />
                                )}
                            </div>
                        </div>
                    ) : (
                        <div style={{ opacity: 0.3, color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            {icon}
                            <span style={{ fontSize: '0.5rem', fontWeight: 'bold', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
                        </div>
                    )}
                </div>
                {item && (
                    <span style={{
                        fontSize: '0.55rem',
                        color: '#bbb',
                        textAlign: 'center',
                        maxWidth: '80px',
                        lineHeight: '1.1',
                        minHeight: '2em', // Reserve space for 2 lines
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                    }}>
                        {item.name}
                    </span>
                )}
            </div>
        );
    };



    const PackageIcon = ({ type, size }) => {
        if (type === 'WEAPON') return <Sword size={size} />;
        if (type === 'ARMOR') return <Shield size={size} />;
        if (type === 'HELMET') return <User size={size} />;
        if (type === 'BOOTS') return <Target size={size} />;
        if (type === 'CAPE') return <Layers size={size} />;
        return <Star size={size} />;
    };

    // Helper para pegar nível de forma segura (duplicado do useMemo acima, mas ok para render)
    const getLvl = (key) => (skills[key]?.level || 1);

    const fmtSkill = (label, key, mult) => {
        const lvl = getLvl(key);
        const pts = (lvl * mult).toFixed(1); // Keep 1 decimal for clarity
        return `• ${label} = LVL ${lvl} = ${pts} pts`;
    };

    const agiBreakdown = `BENEFITS:
• +1 Base Damage per Point = +${Math.floor(calculatedStats.agi)} DMG
• -2ms Attack Speed Delay per Point = -${Math.floor(calculatedStats.agi * 2)}ms

Sources:
${fmtSkill('Animal Skinner', 'ANIMAL_SKINNER', 0.2)}
${fmtSkill('Leather Refiner', 'LEATHER_REFINER', 0.2)}
${fmtSkill('Hunter Crafter', 'HUNTER_CRAFTER', 0.2)}
${fmtSkill('Lumberjack', 'LUMBERJACK', 0.2)}
${fmtSkill('Plank Refiner', 'PLANK_REFINER', 0.2)}

Multiplier: 0.2 per Level (Max 100 Total)`;

    const strBreakdown = `BENEFITS:
• +10 Max Health (HP) per Point = +${Math.floor(calculatedStats.str * 10)} HP
• +1 Base Damage per Point = +${Math.floor(calculatedStats.str)} DMG

Sources:
${fmtSkill('Ore Miner', 'ORE_MINER', 0.2)}
${fmtSkill('Metal Bar Refiner', 'METAL_BAR_REFINER', 0.2)}
${fmtSkill('Warrior Crafter', 'WARRIOR_CRAFTER', 0.2)}
${fmtSkill('Cooking', 'COOKING', 0.2)}
${fmtSkill('Fishing', 'FISHING', 0.2)}

Multiplier: 0.2 per Level (Max 100 Total)`;

    const intBreakdown = `BENEFITS:
• +0.5% Global XP Gain per Point = +${(calculatedStats.int * 0.5).toFixed(1)}% XP
• +0.5% Silver Yield per Point = +${(calculatedStats.int * 0.5).toFixed(1)}% Silver
• +1 Base Damage per Point = +${Math.floor(calculatedStats.int)} DMG

Sources:
${fmtSkill('Fiber Harvester', 'FIBER_HARVESTER', 1 / 6)}
${fmtSkill('Cloth Refiner', 'CLOTH_REFINER', 1 / 6)}
${fmtSkill('Mage Crafter', 'MAGE_CRAFTER', 1 / 6)}
${fmtSkill('Herbalism', 'HERBALISM', 1 / 6)}
${fmtSkill('Distillation', 'DISTILLATION', 1 / 6)}
${fmtSkill('Alchemy', 'ALCHEMY', 1 / 6)}

Multiplier: ~0.16 per Level (Max 100 Total)`;

    if (!gameState) return <div style={{ padding: 20, textAlign: 'center', opacity: 0.5 }}>Loading data...</div>;

    return (
        <>
            <div className="glass-panel" style={{
                height: '100%',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden', // Keeps rounded corners
                borderRadius: '16px',
                background: 'rgba(15, 20, 30, 0.4)',
                minHeight: 0 // Crucial for nested flex scrolling
            }}>
                <div className="scroll-container" style={{
                    padding: isMobile ? '20px' : '30px',
                    paddingBottom: '130px',
                    overflowY: 'auto',
                    flex: 1
                }}>
                    {/* Header com IP - HUB Style */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid var(--border)',
                        paddingBottom: '20px',
                        marginBottom: '30px'
                    }}>
                        <div>
                            <h2 style={{ margin: 0, color: '#fff', fontSize: '1.4rem', fontWeight: '900', letterSpacing: '1px' }}>{name.toUpperCase()}</h2>
                            <div style={{ fontSize: '0.6rem', color: '#555', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px' }}>Lands Explorer</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#d4af37', textShadow: '0 0 15px rgba(212, 175, 55, 0.2)' }}>{avgIP}</div>
                            <div style={{ fontSize: '0.55rem', color: '#555', fontWeight: '900', letterSpacing: '1px' }}>ITEM POWER</div>
                        </div>
                    </div>

                    {/* Barra de Vida - Sophisticated */}
                    <div style={{ marginBottom: '35px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', marginBottom: '8px', fontWeight: '900', letterSpacing: '1px', color: '#888' }}>
                            <span>VITALITY</span>
                            <span style={{ color: '#fff' }}>{Math.floor(stats.hp)} / {Math.floor(stats.maxHp)} HP</span>
                        </div>
                        <div style={{ background: 'rgba(255, 0, 0, 0.05)', height: '6px', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255, 0, 0, 0.1)' }}>
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(stats.hp / stats.maxHp) * 100}%` }}
                                style={{ height: '100%', background: 'linear-gradient(90deg, #ff4d4d, #b30000)' }}
                            />
                        </div>
                    </div>

                    {/* Grid de Equipamentos - Compact Layout */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, auto)',
                        gap: isMobile ? '10px' : '15px',
                        marginBottom: '40px',
                        justifyContent: 'center',
                        padding: isMobile ? '10px 5px' : '25px',
                    }}>
                        <EquipmentSlot slot="cape" icon={<Layers size={20} />} label="CAPE" item={equipment.cape} onClick={() => setSelectedSlot('cape')} onShowInfo={onShowInfo} />
                        <EquipmentSlot slot="helmet" icon={<User size={20} />} label="HEAD" item={equipment.helmet} onClick={() => setSelectedSlot('helmet')} onShowInfo={onShowInfo} />
                        <EquipmentSlot slot="food" icon={<Apple size={20} />} label="FOOD" item={equipment.food} onClick={() => setSelectedSlot('food')} onShowInfo={onShowInfo} />

                        <EquipmentSlot slot="gloves" icon={<Shield size={20} />} label="HANDS" item={equipment.gloves} onClick={() => setSelectedSlot('gloves')} onShowInfo={onShowInfo} />
                        <EquipmentSlot slot="chest" icon={<Shield size={20} />} label="CHEST" item={equipment.chest} onClick={() => setSelectedSlot('chest')} onShowInfo={onShowInfo} />
                        <EquipmentSlot slot="offHand" icon={<Target size={20} />} label="OFF-HAND" item={equipment.offHand} onClick={() => setSelectedSlot('offHand')} onShowInfo={onShowInfo} />

                        <EquipmentSlot slot="mainHand" icon={<Sword size={20} />} label="WEAPON" item={equipment.mainHand} onClick={() => setSelectedSlot('mainHand')} onShowInfo={onShowInfo} />
                        <EquipmentSlot slot="boots" icon={<Target size={20} />} label="FEET" item={equipment.boots} onClick={() => setSelectedSlot('boots')} onShowInfo={onShowInfo} />
                        <div style={{
                            width: '64px',
                            height: '64px',
                            border: '2px dashed rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            background: 'rgba(0,0,0,0.2)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'rgba(255,255,255,0.15)',
                            cursor: 'not-allowed'
                        }}>
                            <div style={{ fontSize: '0.6rem', fontWeight: 'bold' }}>LOCKED</div>
                        </div>
                    </div>

                    {/* Gathering Tools - New Section */}
                    <div style={{ marginBottom: '40px' }}>
                        <h4 style={{ color: 'var(--accent, #d4af37)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '1rem', textAlign: 'center', letterSpacing: '1px' }}>Gathering Tools</h4>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            gap: '10px',
                            flexWrap: 'wrap'
                        }}>
                            <EquipmentSlot slot="tool_axe" icon={<Axe size={20} />} label="AXE" item={equipment.tool_axe} onClick={() => setSelectedSlot('tool_axe')} onShowInfo={onShowInfo} />
                            <EquipmentSlot slot="tool_pickaxe" icon={<Pickaxe size={20} />} label="PICKAXE" item={equipment.tool_pickaxe} onClick={() => setSelectedSlot('tool_pickaxe')} onShowInfo={onShowInfo} />
                            <EquipmentSlot slot="tool_sickle" icon={<Scissors size={20} />} label="SICKLE" item={equipment.tool_sickle} onClick={() => setSelectedSlot('tool_sickle')} onShowInfo={onShowInfo} />
                            <EquipmentSlot slot="tool_knife" icon={<Sword size={20} style={{ transform: 'rotate(45deg)' }} />} label="KNIFE" item={equipment.tool_knife} onClick={() => setSelectedSlot('tool_knife')} onShowInfo={onShowInfo} />
                            <EquipmentSlot slot="tool_rod" icon={<Anchor size={20} />} label="ROD" item={equipment.tool_rod} onClick={() => setSelectedSlot('tool_rod')} onShowInfo={onShowInfo} />
                            <EquipmentSlot slot="tool_pouch" icon={<ShoppingBag size={20} />} label="POUCH" item={equipment.tool_pouch} onClick={() => setSelectedSlot('tool_pouch')} onShowInfo={onShowInfo} />
                        </div>
                    </div>



                    {/* Attributes - Clean HUB Style */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-around',
                        background: 'rgba(255,255,255,0.02)',
                        padding: '20px',
                        borderRadius: '12px',
                        marginBottom: '30px',
                        border: '1px solid var(--border)'
                    }}>
                        {[
                            { label: 'STR', value: stats.str, color: '#ff4444', desc: strBreakdown },
                            { label: 'AGI', value: stats.agi, color: '#4caf50', desc: agiBreakdown },
                            { label: 'INT', value: stats.int, color: '#2196f3', desc: intBreakdown }
                        ].map(stat => (
                            <div key={stat.label} style={{ textAlign: 'center' }}>
                                <div
                                    onClick={() => setInfoModal({ title: stat.label, desc: stat.desc })}
                                    style={{ fontSize: '0.55rem', color: '#555', fontWeight: '900', letterSpacing: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', cursor: 'pointer' }}
                                >
                                    {stat.label}
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <Info size={10} color="#777" />
                                    </div>
                                </div>
                                <div style={{ fontSize: '1.6rem', fontWeight: '900', color: stat.color }}>{parseFloat(Number(stat.value).toFixed(2))}</div>
                            </div>
                        ))}
                    </div>

                    {/* Combat & Action Stats - New Section */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '10px',
                        background: 'rgba(0,0,0,0.2)',
                        padding: '12px',
                        borderRadius: '12px',
                        marginBottom: '30px',
                        border: '1px solid var(--border)'
                    }}>
                        <div style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => setBreakdownModal({ type: 'DAMAGE', value: Math.floor(stats.damage) })}>
                            <div style={{ fontSize: '0.55rem', color: '#888', fontWeight: 'bold', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                                <Sword size={10} color="#ff4444" /> DMG
                            </div>
                            <div style={{ fontSize: '1rem', fontWeight: '900', color: '#fff' }}>{Math.floor(stats.damage)}</div>
                        </div>
                        <div style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => setBreakdownModal({ type: 'DEFENSE', value: Math.floor(stats.defense) })}>
                            <div style={{ fontSize: '0.55rem', color: '#888', fontWeight: 'bold', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                                <Shield size={10} color="#4caf50" /> DEF
                            </div>
                            <div style={{ fontSize: '1rem', fontWeight: '900', color: '#fff' }}>{Math.floor(stats.defense)}</div>
                        </div>
                        <div style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => setBreakdownModal({ type: 'SPEED', value: Math.floor(stats.attackSpeed) })}>
                            <div style={{ fontSize: '0.55rem', color: '#888', fontWeight: 'bold', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                                <Zap size={10} color="#2196f3" /> SPEED
                            </div>
                            <div style={{ fontSize: '1rem', fontWeight: '900', color: '#fff' }}>
                                {(1000 / stats.attackSpeed).toFixed(1)} h/s
                            </div>
                        </div>
                        <div style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => setBreakdownModal({ type: 'EFFICIENCY', value: { total: `+${stats.efficiency.GLOBAL}%`, id: 'GLOBAL' } })}>
                            <div style={{ fontSize: '0.55rem', color: '#888', fontWeight: 'bold', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                                <Star size={10} color="#d4af37" /> EFF
                            </div>
                            <div style={{ fontSize: '1rem', fontWeight: '900', color: '#d4af37' }}>+{stats.efficiency.GLOBAL}%</div>
                        </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '30px' }}>
                        <h4 style={{ color: '#fff', fontSize: '0.7rem', fontWeight: '900', textTransform: 'uppercase', marginBottom: '20px', letterSpacing: '2px', opacity: 0.8, textAlign: 'center' }}>Skill Efficiency</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '10px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '10px' }}>
                                <EfficiencyCard title="Gathering" items={[
                                    { id: 'WOOD', label: 'Woodcutting' },
                                    { id: 'ORE', label: 'Mining' },
                                    { id: 'HIDE', label: 'Skinning' },
                                    { id: 'FIBER', label: 'Fiber' },
                                    { id: 'FISH', label: 'Fishing' },
                                    { id: 'HERB', label: 'Herbalism' }
                                ]} stats={stats} onShowBreakdown={(id, total) => setBreakdownModal({ type: 'EFFICIENCY', value: { id, total } })} />
                                <EfficiencyCard title="Refining" items={[
                                    { id: 'PLANK', label: 'Planks' },
                                    { id: 'METAL', label: 'Bars' },
                                    { id: 'LEATHER', label: 'Leathers' },
                                    { id: 'CLOTH', label: 'Cloth' },
                                    { id: 'EXTRACT', label: 'Distillation' }
                                ]} stats={stats} onShowBreakdown={(id, total) => setBreakdownModal({ type: 'EFFICIENCY', value: { id, total } })} />
                                <EfficiencyCard title="Crafting" items={[
                                    { id: 'WARRIOR', label: 'Warrior Gear' },
                                    { id: 'HUNTER', label: 'Hunter Gear' },
                                    { id: 'MAGE', label: 'Mage Gear' },
                                    { id: 'COOKING', label: 'Cooking' },
                                    { id: 'ALCHEMY', label: 'Alchemy' },
                                    { id: 'TOOLS', label: 'Tools' }
                                ]} stats={stats} onShowBreakdown={(id, total) => setBreakdownModal({ type: 'EFFICIENCY', value: { id, total } })} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {selectedSlot && (
                <EquipmentSelectModal
                    slot={selectedSlot}
                    onClose={() => setSelectedSlot(null)}
                    currentItem={equipment[selectedSlot]}
                    inventory={gameState.state.inventory || {}}
                    onEquip={handleEquip}
                    onUnequip={handleUnequip}
                    onShowInfo={onShowInfo}
                />
            )}

            {breakdownModal && (
                <StatBreakdownModal
                    statType={breakdownModal.type}
                    value={typeof breakdownModal.value === 'object' ? breakdownModal.value.total : breakdownModal.value}
                    statId={typeof breakdownModal.value === 'object' ? breakdownModal.value.id : null}
                    stats={{ ...stats, skills }} // Pass skills for efficiency breakdown
                    equipment={equipment}
                    onClose={() => setBreakdownModal(null)}
                />
            )}

            {/* INFO MODAL FOR STATS */}
            {infoModal && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(2px)'
                }} onClick={() => setInfoModal(null)}>
                    <div style={{
                        background: '#1a1a1a',
                        border: '1px solid var(--border)',
                        borderRadius: '12px',
                        padding: '20px',
                        maxWidth: '80%',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                    }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ color: 'var(--accent)', marginTop: 0 }}>{infoModal.title}</h3>
                        <p style={{ color: '#ccc', fontSize: '0.9rem', whiteSpace: 'pre-line' }}>{infoModal.desc}</p>
                        <button
                            onClick={() => setInfoModal(null)}
                            style={{
                                marginTop: '10px',
                                width: '100%',
                                padding: '8px',
                                background: 'var(--accent)',
                                border: 'none',
                                borderRadius: '6px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            Got it
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

const EfficiencyCard = ({ title, items, stats, onShowBreakdown }) => (
    <div style={{ background: 'rgba(0,0,0,0.1)', padding: '15px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.02)' }}>
        <div style={{ fontSize: '0.55rem', color: '#d4af37', fontWeight: '900', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>{title}</div>
        {items.map(item => (
            <div key={item.id}
                style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', marginBottom: '5px', opacity: 0.8, cursor: 'pointer' }}
                onClick={() => onShowBreakdown && onShowBreakdown(item.id, `+${(stats.efficiency[item.id] || 0).toFixed(1)}%`)}
            >
                <span style={{ color: '#888' }}>{item.label}</span>
                <span style={{ color: '#fff', fontWeight: 'bold' }}>+{(stats.efficiency[item.id] || 0).toFixed(1)}% <Info size={10} color="#555" /></span>
            </div>
        ))}
    </div>
);

const EfficiencyRow = ({ label, value }) => (
    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '5px 8px', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '4px' }}>
        <span style={{ color: '#888' }}>{label}:</span>
        <span style={{ color: '#d4af37', fontWeight: 'bold' }}>+{value}%</span>
    </div>
);

const StatRow = ({ label, value, color }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
        <span style={{ color: '#888' }}>{label}:</span>
        <span style={{ color, fontWeight: 'bold' }}>{value}</span>
    </div>
);

export default ProfilePanel;
