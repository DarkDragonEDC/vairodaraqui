import React from 'react';
import { X, Sword, Shield, Heart, Star } from 'lucide-react';
import { QUALITIES } from '../data/items';

const ItemInfoModal = ({ item, onClose }) => {
    if (!item) return null;

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const baseStats = item.stats || {};
    const mainStatKey = baseStats.damage ? 'damage' : (baseStats.hp ? 'hp' : (baseStats.defense ? 'defense' : null));
    const mainStatLabel = mainStatKey === 'damage' ? 'Dmg' : (mainStatKey === 'hp' ? 'HP' : (mainStatKey === 'defense' ? 'Def' : 'Stat'));

    const calculateStat = (baseValue, ipBonus) => {
        // Fórmula aproximada baseada no feedback do usuário: +100 IP = +100% (dobra o stat)
        // Isso é linear: Stat * (1 + BonusIP/100)
        return Math.floor(baseValue * (1 + ipBonus / 100));
    };

    const rarityComparison = Object.values(QUALITIES).map(q => ({
        ...q,
        value: mainStatKey ? calculateStat(baseStats[mainStatKey], q.ipBonus) : null
    }));

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.85)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(8px)',
            padding: '20px'
        }} onClick={handleBackdropClick}>
            <div style={{
                background: 'rgb(26, 26, 46)',
                width: '95%',
                maxWidth: '450px',
                maxHeight: '90vh',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                padding: '20px',
                gap: '20px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                color: '#fff'
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    paddingBottom: '12px',
                    position: 'relative'
                }}>
                    <div style={{
                        position: 'absolute',
                        top: -20,
                        left: -20,
                        right: -20,
                        height: '4px',
                        background: item.rarityColor || '#d4af37',
                        borderRadius: '12px 12px 0 0'
                    }}></div>
                    <h3 style={{ margin: 0, color: item.rarityColor || '#d4af37', fontSize: '1.2rem', fontWeight: 'bold' }}>
                        {item.qualityName ? `${item.qualityName} ` : ''}{item.name} T{item.tier}
                    </h3>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', transition: '0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#888'}
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Basic Info Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                    fontSize: '0.9rem',
                    background: 'rgba(0,0,0,0.2)',
                    padding: '15px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.05)'
                }}>
                    <div><span style={{ color: '#888' }}>Tier:</span> T{item.tier}</div>
                    <div><span style={{ color: '#888' }}>Type:</span> {item.type}</div>
                    <div><span style={{ color: '#888' }}>IP:</span> {item.ip || 0}</div>
                    <div><span style={{ color: '#888' }}>Rarity:</span> <span style={{ color: item.rarityColor || '#fff', fontWeight: 'bold' }}>{item.qualityName || 'Normal'}</span></div>

                    {/* Stats List */}
                    <div style={{ gridColumn: '1 / -1', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ color: '#888', marginBottom: '8px', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Attributes</div>
                        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                            {baseStats.damage && <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#ff4444' }}><Sword size={14} /> {item.stats.damage} Dmg</div>}
                            {baseStats.hp && <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#ff4d4d' }}><Heart size={14} /> {item.stats.hp} HP</div>}
                            {baseStats.defense && <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#4caf50' }}><Shield size={14} /> {item.stats.defense} Def</div>}
                        </div>
                    </div>
                </div>

                {/* Rarity Comparison Section */}
                {mainStatKey && (
                    <div>
                        <h4 style={{
                            fontSize: '0.85rem',
                            color: '#888',
                            marginBottom: '10px',
                            marginTop: '5px',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            Rarity Comparison <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>(Est. {mainStatLabel})</span>
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {rarityComparison.map(q => (
                                <div key={q.id} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    background: q.id === (item.quality || 0) ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.2)',
                                    border: q.id === (item.quality || 0) ? `1px solid ${q.color}` : '1px solid transparent',
                                    transition: '0.2s',
                                    boxShadow: q.id === (item.quality || 0) ? `0 0 15px ${q.color}20` : 'none'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: q.color }}></div>
                                        <div style={{ fontWeight: 'bold', color: q.color, fontSize: '0.85rem' }}>{q.name}</div>
                                        {q.id === (item.quality || 0) && (
                                            <span style={{
                                                fontSize: '0.55rem',
                                                background: q.color,
                                                color: '#000',
                                                padding: '2px 5px',
                                                borderRadius: '3px',
                                                fontWeight: '900',
                                                marginLeft: '5px'
                                            }}>
                                                ATUAL
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: q.id === (item.quality || 0) ? '#fff' : '#aaa' }}>
                                        {mainStatLabel}: {q.value}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div style={{ textAlign: 'center', color: '#555', fontSize: '0.75rem', marginTop: '5px' }}>
                    Click outside to close.
                </div>
            </div>
        </div>
    );
};

export default ItemInfoModal;
