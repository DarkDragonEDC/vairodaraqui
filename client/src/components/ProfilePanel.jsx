import React, { useMemo, useState } from 'react';
import EquipmentSelectModal from './EquipmentSelectModal';
import { motion } from 'framer-motion';
import {
    Heart, Shield, Sword, Zap,
    User, Target, Star, Layers,
    Axe, Pickaxe, Scissors, Anchor, Apple, Info
} from 'lucide-react';
import { getTierColor } from '../data/items';

const ProfilePanel = ({ gameState, session, socket, onShowInfo }) => {
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [infoModal, setInfoModal] = useState(null);

    const handleEquip = (itemId) => {
        // ... existing code ...
        // ... inside return ...
        {/* Atributos - Clean HUB Style */ }
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
                { label: 'STR', value: stats.str, color: '#ff4444', desc: 'Cada ponto concede: +10 HP e +1 Dano Base' },
                { label: 'AGI', value: stats.agi, color: '#4caf50', desc: 'Cada ponto concede: +5 Velocidade de Ataque e +1 Dano Base' },
                { label: 'INT', value: stats.int, color: '#2196f3', desc: 'Cada ponto concede: +1% XP Global (Eficiência), +2% Prata e +2 Dano Base' }
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
                    <div style={{ fontSize: '1.6rem', fontWeight: '900', color: stat.color }}>{stat.value}</div>
                </div>
            ))}
        </div>

        {/* INFO MODAL FOR STATS */ }
        {
            infoModal && (
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)',
                    zIndex: 50,
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
                    }}>
                        <h3 style={{ color: 'var(--accent)', marginTop: 0 }}>{infoModal.title}</h3>
                        <p style={{ color: '#ccc', fontSize: '0.9rem' }}>{infoModal.desc}</p>
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
                            Entendi
                        </button>
                    </div>
                </div>
            )
        }

        // ... rest of code ...        socket.emit('equip_item', { itemId });
        // Close modal handled by component but good ensuring local state clear if needed, though component does it.
    };

    const handleUnequip = (slot) => {
        socket.emit('unequip_item', { slot });
    };
    if (!gameState) return <div style={{ padding: 20, textAlign: 'center', opacity: 0.5 }}>Carregando dados...</div>;

    const { name = 'Explorador', state } = gameState;
    const { skills = {}, silver = 0, health = 100, maxHealth = 100, equipment = {} } = state || {};

    const charStats = state?.stats || { str: 0, agi: 0, int: 0 };

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

        // AGI: Hunter Class (Skinning, Tanning, Hunter Crafting)
        agi += getLvl('ANIMAL_SKINNER');
        agi += getLvl('LEATHER_REFINER');
        agi += getLvl('HUNTER_CRAFTER');

        // INT: Mage Class (Harvesting, Woodcutting, Weaving, Woodworking, Mage Crafting)
        int += getLvl('FIBER_HARVESTER');
        int += getLvl('LUMBERJACK');
        int += getLvl('CLOTH_REFINER');
        int += getLvl('PLANK_REFINER');
        int += getLvl('MAGE_CRAFTER');

        // Cooking e Fishing podem dar INT ou serem neutros. 
        // Por padrão em muitos RPGs, Cooking/Alchemy = INT.
        int += getLvl('COOKING');
        int += getLvl('FISHING');

        return { str, agi, int };
    }, [skills]);

    const stats = {
        hp: 100 + (calculatedStats.str * 10), // STR aumenta HP
        maxHp: 100 + (calculatedStats.str * 10),
        damage: 10 + (calculatedStats.str * 1) + (calculatedStats.agi * 1) + (calculatedStats.int * 2), // Todos aumentam dano, INT escala melhor magia? Simplificado: Todos +1
        defense: 5 + (calculatedStats.str * 1),
        attackSpeed: 1000 - (calculatedStats.agi * 5), // AGI aumenta velocidade
        str: calculatedStats.str,
        agi: calculatedStats.agi,
        int: calculatedStats.int,
        efficiency: {
            WOOD: (calculatedStats.int * 1) + ((skills.LUMBERJACK?.level || 1) * 0.5),
            ORE: (calculatedStats.int * 1) + ((skills.ORE_MINER?.level || 1) * 0.5),
            HIDE: (calculatedStats.int * 1) + ((skills.ANIMAL_SKINNER?.level || 1) * 0.5),
            FIBER: (calculatedStats.int * 1) + ((skills.FIBER_HARVESTER?.level || 1) * 0.5),
            FISH: (calculatedStats.int * 1) + ((skills.FISHING?.level || 1) * 0.5),
            PLANK: (calculatedStats.int * 1) + ((skills.PLANK_REFINER?.level || 1) * 0.5),
            METAL: (calculatedStats.int * 1) + ((skills.METAL_BAR_REFINER?.level || 1) * 0.5),
            LEATHER: (calculatedStats.int * 1) + ((skills.LEATHER_REFINER?.level || 1) * 0.5),
            CLOTH: (calculatedStats.int * 1) + ((skills.CLOTH_REFINER?.level || 1) * 0.5),
            WARRIOR: (calculatedStats.int * 1) + ((skills.WARRIOR_CRAFTER?.level || 1) * 0.5),
            HUNTER: (calculatedStats.int * 1) + ((skills.HUNTER_CRAFTER?.level || 1) * 0.5),
            MAGE: (calculatedStats.int * 1) + ((skills.MAGE_CRAFTER?.level || 1) * 0.5),
            COOKING: (calculatedStats.int * 1) + ((skills.COOKING?.level || 1) * 0.5),
            GLOBAL: calculatedStats.int * 1 // INT define eficiencia global (XP)
        },
        silverMultiplier: 1.0 + (calculatedStats.int * 0.02) // INT aumenta Silver
    };

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

    const EquipmentSlot = ({ slot, icon, label, item, onClick, onShowInfo }) => {
        const tierColor = item ? getTierColor(item.tier) : 'rgba(255,255,255,0.05)';
        // Se tiver qualidade, usa a cor da raridade, senão usa a cor do tier
        const borderColor = item && item.rarityColor ? item.rarityColor : tierColor;
        const hasQuality = item && item.quality > 0;

        return (
            <div style={{
                width: '64px',
                height: '64px',
                background: 'rgba(0,0,0,0.3)',
                border: `2px solid ${item ? borderColor : 'rgba(255,255,255,0.05)'}`,
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                cursor: 'pointer',
                transition: '0.2s',
                boxShadow: item ? `0 0 10px ${borderColor}${hasQuality ? '44' : '33'}` : 'none'
            }}
                onClick={onClick}
            >
                {item ? (
                    <div style={{ color: tierColor, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.6rem', fontWeight: 'bold', position: 'absolute', top: 2, left: 4 }}>T{item.tier}</span>
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
                        <PackageIcon type={item.type} size={24} />
                    </div>
                ) : (
                    <div style={{ opacity: 0.1, color: '#fff' }}>{icon}</div>
                )}
                <div style={{
                    position: 'absolute',
                    bottom: '-18px',
                    fontSize: '0.55rem',
                    color: '#555',
                    whiteSpace: 'nowrap',
                    textTransform: 'uppercase',
                    fontWeight: 'bold'
                }}>
                    {label}
                </div>
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

    return (
        <div className="glass-panel" style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            borderRadius: '16px',
            background: 'rgba(15, 20, 30, 0.4)'
        }}>
            <div className="scroll-container" style={{ padding: '30px' }}>
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
                        <span>VITALIDADE</span>
                        <span style={{ color: '#fff' }}>{health} / {maxHealth} HP</span>
                    </div>
                    <div style={{ background: 'rgba(255, 0, 0, 0.05)', height: '6px', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255, 0, 0, 0.1)' }}>
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(health / maxHealth) * 100}%` }}
                            style={{ height: '100%', background: 'linear-gradient(90deg, #ff4d4d, #b30000)' }}
                        />
                    </div>
                </div>

                {/* Grid de Equipamentos - Thinner Slots */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '30px',
                    marginBottom: '40px',
                    justifyItems: 'center',
                    padding: '25px',
                }}>
                    <EquipmentSlot slot="cape" icon={<Layers size={24} />} label="CAPA" item={equipment.cape} onClick={() => setSelectedSlot('cape')} onShowInfo={onShowInfo} />
                    <EquipmentSlot slot="helmet" icon={<User size={24} />} label="CABEÇA" item={equipment.helmet} onClick={() => setSelectedSlot('helmet')} onShowInfo={onShowInfo} />
                    <EquipmentSlot slot="food" icon={<Apple size={24} />} label="COMIDA" item={equipment.food} onClick={() => setSelectedSlot('food')} onShowInfo={onShowInfo} />

                    <EquipmentSlot slot="gloves" icon={<Shield size={24} />} label="MÃOS" item={equipment.gloves} onClick={() => setSelectedSlot('gloves')} onShowInfo={onShowInfo} />
                    <EquipmentSlot slot="chest" icon={<Shield size={24} />} label="PEITO" item={equipment.chest} onClick={() => setSelectedSlot('chest')} onShowInfo={onShowInfo} />
                    <EquipmentSlot slot="offHand" icon={<Target size={24} />} label="SECUND." item={equipment.offHand} onClick={() => setSelectedSlot('offHand')} onShowInfo={onShowInfo} />

                    <EquipmentSlot slot="mainHand" icon={<Sword size={24} />} label="ARMA" item={equipment.mainHand} onClick={() => setSelectedSlot('mainHand')} onShowInfo={onShowInfo} />
                    <EquipmentSlot slot="boots" icon={<Target size={24} />} label="PÉS" item={equipment.boots} onClick={() => setSelectedSlot('boots')} onShowInfo={onShowInfo} />
                    <EquipmentSlot slot="cape" icon={<Layers size={24} />} label="CAPA" item={equipment.cape} onClick={() => setSelectedSlot('cape')} onShowInfo={onShowInfo} />
                </div>

                {/* Ferramentas de Coleta - New Section */}
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
                    </div>
                </div>

                <div style={{ display: 'none' }}> {/* Hidden Legacy slot just in case */}
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

                {/* Atributos - Clean HUB Style */}
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
                        { label: 'STR', value: stats.str, color: '#ff4444', desc: 'Cada ponto concede: +10 HP e +1 Dano Base' },
                        { label: 'AGI', value: stats.agi, color: '#4caf50', desc: 'Cada ponto concede: +5 Velocidade de Ataque e +1 Dano Base' },
                        { label: 'INT', value: stats.int, color: '#2196f3', desc: 'Cada ponto concede: +1% XP Global (Eficiência), +2% Prata e +2 Dano Base' }
                    ].map(stat => (
                        <div key={stat.label} style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.55rem', color: '#555', fontWeight: '900', letterSpacing: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                {stat.label}
                                <div title={stat.desc} style={{ cursor: 'help', display: 'flex', alignItems: 'center' }}>
                                    <Info size={10} color="#777" />
                                </div>
                            </div>
                            <div style={{ fontSize: '1.6rem', fontWeight: '900', color: stat.color }}>{stat.value}</div>
                        </div>
                    ))}
                </div>

                {/* Combat Stats - New Section */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-around',
                    background: 'rgba(0,0,0,0.2)',
                    padding: '15px',
                    borderRadius: '12px',
                    marginBottom: '30px',
                    border: '1px solid var(--border)'
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.6rem', color: '#888', fontWeight: 'bold', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}><Sword size={12} color="#ff4444" /> DAMAGE</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#fff' }}>{Math.floor(stats.damage)}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.6rem', color: '#888', fontWeight: 'bold', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}><Shield size={12} color="#4caf50" /> DEFENSE</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#fff' }}>{Math.floor(stats.defense)}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.6rem', color: '#888', fontWeight: 'bold', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}><Zap size={12} color="#2196f3" /> SPEED</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#fff' }}>{Math.floor(stats.attackSpeed)}</div>
                    </div>
                </div>

                {/* Eficiências - Sophisticated Sub-HUB */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '30px' }}>
                    <h4 style={{ color: '#fff', fontSize: '0.7rem', fontWeight: '900', textTransform: 'uppercase', marginBottom: '20px', letterSpacing: '2px', opacity: 0.8 }}>Eficácia de Habilidades</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '10px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                            <EfficiencyCard title="Coleta" items={[
                                { id: 'WOOD', label: 'Woodcutting' },
                                { id: 'ORE', label: 'Mining' },
                                { id: 'HIDE', label: 'Skinning' },
                                { id: 'FIBER', label: 'Fiber' },
                                { id: 'FISH', label: 'Fishing' }
                            ]} stats={stats} />
                            <EfficiencyCard title="Refino" items={[
                                { id: 'PLANK', label: 'Planks' },
                                { id: 'METAL', label: 'Bars' },
                                { id: 'LEATHER', label: 'Leathers' },
                                { id: 'CLOTH', label: 'Cloth' }
                            ]} stats={stats} />
                            <EfficiencyCard title="Craft" items={[
                                { id: 'WARRIOR', label: 'Warrior Gear' },
                                { id: 'HUNTER', label: 'Hunter Gear' },
                                { id: 'MAGE', label: 'Mage Gear' },
                                { id: 'COOKING', label: 'Cooking' }
                            ]} stats={stats} />
                        </div>
                        {/* Global */}
                        <div style={{
                            marginTop: '15px',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '10px'
                        }}>
                            <span style={{ color: '#555', fontWeight: 'bold', fontSize: '0.65rem', letterSpacing: '1px', textTransform: 'uppercase' }}>Global Efficiency</span>
                            <span style={{ color: '#d4af37', fontWeight: '900', fontSize: '1.2rem' }}>+{stats.efficiency.GLOBAL}%</span>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
};

const EfficiencyCard = ({ title, items, stats }) => (
    <div style={{ background: 'rgba(0,0,0,0.1)', padding: '15px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.02)' }}>
        <div style={{ fontSize: '0.55rem', color: '#d4af37', fontWeight: '900', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>{title}</div>
        {items.map(item => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', marginBottom: '5px', opacity: 0.8 }}>
                <span style={{ color: '#888' }}>{item.label}</span>
                <span style={{ color: '#fff', fontWeight: 'bold' }}>+{stats.efficiency[item.id] || 0}%</span>
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
