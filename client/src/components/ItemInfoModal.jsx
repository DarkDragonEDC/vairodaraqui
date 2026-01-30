import React from 'react';
import { X, Sword, Shield, Heart, Star, Zap } from 'lucide-react';
import { QUALITIES, resolveItem } from '@shared/items';
import { CHEST_DROP_TABLE } from '@shared/chest_drops';

const ItemInfoModal = ({ item: rawItem, onClose }) => {
    if (!rawItem) return null;

    const resolved = resolveItem(rawItem.id || rawItem.item_id);

    // For tools/gear, we want to prioritize the resolved (authentic) stats over stale stored stats
    const mergedStats = { ...resolved?.stats };
    // If it's not a tool, we can allow some merging if needed, but for tools specifically 
    // we must ensure efficiency comes from the formula.
    const item = {
        ...resolved,
        ...rawItem,
        stats: {
            ...rawItem.stats,
            ...mergedStats
        }
    };

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const baseStats = item.stats || {};
    const statKeys = Object.keys(baseStats).filter(k =>
        (typeof baseStats[k] === 'number' && ['damage', 'defense', 'hp', 'str', 'agi', 'int'].includes(k)) ||
        (k === 'efficiency')
    );

    // For comparison, we need the AUTHENTIC base stats of the item (Quality 0)
    // otherwise we are scaling a scaled value.
    const baseItemResult = resolveItem(item.originalId || item.id);
    const comparisonBaseStats = baseItemResult?.stats || {};
    const comparisonStatKeys = Object.keys(comparisonBaseStats).filter(k =>
        (typeof comparisonBaseStats[k] === 'number' || typeof comparisonBaseStats[k] === 'object') &&
        ['damage', 'defense', 'hp', 'str', 'agi', 'int', 'efficiency'].includes(k)
    );

    const rarityComparison = Object.values(QUALITIES).map(q => {
        const qResolved = resolveItem(item.originalId || item.id, q.id);
        const qStats = qResolved?.stats || {};

        const calculatedStats = {};
        comparisonStatKeys.forEach(key => {
            if (key === 'efficiency') {
                if (typeof qStats[key] === 'number') calculatedStats.efficiency = qStats[key];
                else if (typeof qStats[key] === 'object' && qStats[key].GLOBAL) calculatedStats.globalEff = qStats[key].GLOBAL;
            } else {
                calculatedStats[key] = qStats[key];
            }
        });

        return {
            ...q,
            calculatedStats
        };
    });

    // Clean name: remove T{tier} from the name if we are going to append it manually
    const cleanBaseName = (item.name || '').replace(new RegExp(` T${item.tier}$`), '');

    const getItemDescription = (itm) => {
        if (['WEAPON'].includes(itm.type)) return "Offensive equipment. Increases your Damage.";
        if (['ARMOR', 'HELMET', 'BOOTS', 'GLOVES'].includes(itm.type)) return "Defensive equipment. Increases your Health and Defense.";
        if (['OFF_HAND'].includes(itm.type)) {
            if (itm.id.includes('SHIELD')) return "Secondary defensive equipment.";
            return "Secondary equipment. Offers various bonuses.";
        }
        if (itm.type === 'CAPE') return "Special cape. Offers passive bonuses and global efficiency.";
        if (itm.type.startsWith('TOOL')) return "Gathering tool. Required to gather higher TIER resources.";

        if (itm.type === 'FOOD') return "Consumable. Restores Health over time.";
        if (itm.type === 'MAP') return "Dungeon Map. Use to access dangerous areas with valuable rewards.";
        if (itm.type === 'CRAFTING_MATERIAL' && itm.id.includes('CREST')) return "Rare boss material. Used to craft prestige items.";

        if (itm.type === 'RESOURCE') {
            if (itm.req) return "Refined material. Used to craft equipment and structures.";
            return "Raw material gathered in the world. Used to refine materials.";
        }

        if (itm.type === 'POTION') return itm.desc || "Consumable potion with special effects.";

        return "A useful item for your journey.";
    };

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
                color: '#fff',
                overflow: 'hidden' // Fix overflow leaking
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    paddingBottom: '12px',
                    position: 'relative',
                    flexShrink: 0 // Prevent header shrinking
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
                        {cleanBaseName} T{item.tier}
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

                {/* Scrollable Content Wrapper */}
                <div style={{
                    overflowY: 'auto',
                    paddingRight: '5px',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px',
                    marginRight: '-10px', // Compensation for padding
                    paddingRight: '10px' // Space for scrollbar
                }}>

                    {/* Description Section */}
                    <div style={{
                        padding: '12px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        fontSize: '0.9rem',
                        color: '#ddd',
                        fontStyle: 'italic',
                        lineHeight: '1.4',
                        textAlign: 'center'
                    }}>
                        "{getItemDescription(item)}"
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
                        <div><span style={{ color: '#888' }}>Rarity:</span> <span style={{ color: item.rarityColor || '#fff', fontWeight: 'bold' }}>{item.qualityName}</span></div>

                        {/* Stats List */}
                        <div style={{ gridColumn: '1 / -1', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ color: '#888', marginBottom: '8px', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Attributes</div>
                            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                                {baseStats.damage && <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#ff4444' }}><Sword size={14} /> {item.stats.damage} Dmg</div>}
                                {baseStats.hp && <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#ff4d4d' }}><Heart size={14} /> {item.stats.hp} HP</div>}
                                {baseStats.defense && <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#4caf50' }}><Shield size={14} /> {item.stats.defense} Def</div>}
                                {baseStats.attackSpeed && <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#ffd700' }}><Zap size={14} /> {(1000 / item.stats.attackSpeed).toFixed(1)}/s Spd</div>}
                                {baseStats.speed && <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#ffd700' }}><Zap size={14} /> {item.stats.speed} Spd</div>}
                                {baseStats.str && <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#ff4444' }}>STR +{item.stats.str}</div>}
                                {baseStats.agi && <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#4caf50' }}>AGI +{item.stats.agi}</div>}
                                {baseStats.int && <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#2196f3' }}>INT +{item.stats.int}</div>}
                                {item.heal && <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#4caf50' }}><Heart size={14} /> Heals {item.heal}</div>}
                                {item.type === 'POTION' && item.desc && <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#d4af37' }}><Zap size={14} /> Effect: {item.desc}</div>}
                                {baseStats.efficiency && typeof baseStats.efficiency === 'number' && <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#d4af37' }}><Star size={14} /> Efficiency +{item.stats.efficiency}%</div>}
                                {baseStats.efficiency && typeof baseStats.efficiency === 'object' && baseStats.efficiency.GLOBAL && <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#d4af37' }}><Star size={14} /> Global Eff +{item.stats.efficiency.GLOBAL}%</div>}
                            </div>
                        </div>
                    </div>

                    {/* Chest Drop Table */}
                    {item.id.includes('CHEST') && (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            background: 'rgba(0,0,0,0.2)',
                            padding: '15px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            <div style={{ color: '#888', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Possible Rewards</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {CHEST_DROP_TABLE.REFINED_TYPES.map(type => (
                                    <div key={type} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                        <span style={{ color: '#ddd' }}>{type.charAt(0) + type.slice(1).toLowerCase()}</span>
                                        <span style={{ color: '#4a90e2', fontWeight: 'bold' }}>20%</span>
                                    </div>
                                ))}
                                {CHEST_DROP_TABLE.RARITIES[item.rarity]?.crestChance > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px', marginTop: '2px' }}>
                                        <span style={{ color: '#f5a623' }}>Boss Crest</span>
                                        <span style={{ color: '#f5a623', fontWeight: 'bold' }}>{(CHEST_DROP_TABLE.RARITIES[item.rarity].crestChance * 100).toFixed(0)}%</span>
                                    </div>
                                )}
                            </div>
                            <div style={{ marginTop: '5px', fontSize: '0.75rem', color: '#666', fontStyle: 'italic', textAlign: 'center' }}>
                                * Yields {CHEST_DROP_TABLE.RARITIES[item.rarity]?.baseQty || 5} to {(CHEST_DROP_TABLE.RARITIES[item.rarity]?.baseQty || 5) + item.tier} materials.
                            </div>
                        </div>
                    )}

                    {/* Rarity Comparison Section */}
                    {statKeys.length > 0 && !['FOOD', 'POTION'].includes(item.type) && !item.id.includes('FOOD') && !item.id.includes('POTION') && (
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
                                Rarity Comparison <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>(Est. Stats)</span>
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
                                                    CURRENT
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: q.id === (item.quality || 0) ? '#fff' : '#aaa', display: 'flex', gap: '8px', textAlign: 'right' }}>
                                            {Object.entries(q.calculatedStats).map(([key, val]) => {
                                                let label = key.toUpperCase();
                                                if (key === 'damage') label = 'Dmg';
                                                if (key === 'defense') label = 'Def';
                                                if (key === 'globalEff') label = 'Global Eff';
                                                if (key === 'efficiency') label = 'Eff';
                                                return (
                                                    <span key={key}>
                                                        {label}: {key === 'globalEff' || key === 'efficiency' ? '+' : ''}{val}{key === 'globalEff' || key === 'efficiency' ? '%' : ''}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div style={{ textAlign: 'center', color: '#555', fontSize: '0.75rem', marginTop: '5px' }}>
                        Click outside to close.
                    </div>
                </div> {/* End Scrollable Wrapper */}
            </div>
        </div>
    );
};

export default ItemInfoModal;
