
import React from 'react';
import { X, Sword, Shield, Heart, Zap, Play, Layers, User, Pickaxe, Target, Apple, Star, Info } from 'lucide-react';
import { resolveItem, getTierColor } from '@shared/items';

const EquipmentSelectModal = ({ slot, onClose, currentItem, onEquip, onUnequip, inventory, onShowInfo }) => {

    // Filter candidates from inventory based on slot
    const { candidates, bestCandidate } = React.useMemo(() => {
        const list = [];
        Object.entries(inventory).forEach(([itemId, qty]) => {
            if (qty <= 0) return;
            const item = resolveItem(itemId);
            if (!item) return;

            let matches = false;
            switch (slot) {
                case 'cape': matches = item.type === 'CAPE'; break;
                case 'helmet': case 'head': matches = item.type === 'HELMET'; break;
                case 'tool_axe': matches = item.type === 'TOOL_AXE'; break;
                case 'tool_pickaxe': matches = item.type === 'TOOL_PICKAXE'; break;
                case 'tool_knife': matches = item.type === 'TOOL_KNIFE'; break;
                case 'tool_sickle': matches = item.type === 'TOOL_SICKLE'; break;
                case 'tool_rod': matches = item.type === 'TOOL_ROD'; break;
                case 'gloves': matches = item.type === 'GLOVES'; break;
                case 'chest': matches = item.type === 'ARMOR'; break;
                case 'offHand': matches = item.type === 'OFF_HAND'; break;
                case 'mainHand': matches = item.type === 'WEAPON'; break;
                case 'boots': case 'shoes': matches = item.type === 'BOOTS'; break;
                case 'food': matches = item.type === 'FOOD'; break;
                default: matches = false;
            }

            if (matches) {
                list.push({ ...item, qty });
            }
        });

        // Sort by IP desc, then quality desc
        list.sort((a, b) => {
            if ((b.ip || 0) !== (a.ip || 0)) return (b.ip || 0) - (a.ip || 0);
            if ((b.quality || 0) !== (a.quality || 0)) return (b.quality || 0) - (a.quality || 0);
            return b.tier - a.tier;
        });

        const best = list.length > 0 ? list[0] : null;

        return { candidates: list, bestCandidate: best };
    }, [slot, inventory]);

    // Resolve current item for comparison
    const resolvedCurrent = React.useMemo(() => {
        if (!currentItem) return null;
        return { ...resolveItem(currentItem.id), ...currentItem };
    }, [currentItem]);

    // Check if the best candidate is actually better than current
    const isRecommended = React.useCallback((candidate) => {
        if (!candidate) return false;
        if (!resolvedCurrent) return true;

        const cVal = candidate.ip || candidate.tier || 0;
        const curVal = resolvedCurrent.ip || resolvedCurrent.tier || 0;

        if (cVal > curVal) return true;
        // If IP is equal, check quality
        if (cVal === curVal && (candidate.quality || 0) > (resolvedCurrent.quality || 0)) return true;

        return false;
    }, [resolvedCurrent]);

    const showRecommendation = bestCandidate && isRecommended(bestCandidate);

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(5px)'
        }} onClick={handleBackdropClick}>
            <div style={{
                background: '#1a1d26',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '16px',
                width: '90%',
                maxWidth: '500px',
                maxHeight: '80vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(0,0,0,0.2)',
                    flexShrink: 0
                }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Select {slot}
                    </h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', padding: '5px' }}>
                        <X size={24} />
                    </button>
                </div>
                <div style={{
                    flex: 1,
                    padding: '20px',
                    paddingBottom: '20px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px',
                    minHeight: 0
                }}>

                    {/* Recommendation Section */}
                    {showRecommendation && (
                        <div>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '0.75rem',
                                color: 'var(--accent)',
                                textTransform: 'uppercase',
                                marginBottom: '10px',
                                fontWeight: '900',
                                letterSpacing: '1px'
                            }}>
                                <Zap size={14} fill="var(--accent)" /> Recommended Item
                            </div>
                            <div
                                onClick={() => { onEquip(bestCandidate.id); onClose(); }}
                                style={{
                                    background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.15) 0%, rgba(0, 0, 0, 0.4) 100%)',
                                    border: '1px solid var(--accent)',
                                    borderRadius: '12px',
                                    padding: '15px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    cursor: 'pointer',
                                    boxShadow: '0 0 20px rgba(212, 175, 55, 0.1)'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        background: 'rgba(0,0,0,0.4)',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: `1px solid ${bestCandidate.quality > 0 ? bestCandidate.rarityColor : 'var(--accent)'}`,
                                        boxShadow: bestCandidate.quality > 0 ? `0 0 10px ${bestCandidate.rarityColor}55` : 'none'
                                    }}>
                                        <Star size={24} color={bestCandidate.quality > 0 ? bestCandidate.rarityColor : 'var(--accent)'} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#fff' }}>
                                            {bestCandidate.qualityName && bestCandidate.qualityName !== 'Normal' ? `${bestCandidate.qualityName} ` : ''}{bestCandidate.name}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>
                                            IP {bestCandidate.ip || 0} • Tier {bestCandidate.tier}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ background: 'var(--accent)', color: '#000', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.75rem' }}>
                                    EQUIP BEST
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Current Item Section */}
                    {currentItem && (
                        <div>
                            <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', marginBottom: '10px', fontWeight: 'bold' }}>
                                Currently Equipped
                            </div>
                            <div style={{
                                background: 'rgba(76, 175, 80, 0.05)',
                                border: '1px solid rgba(76, 175, 80, 0.2)',
                                borderRadius: '12px',
                                padding: '15px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        background: 'rgba(0,0,0,0.3)',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: '1px solid rgba(255,255,255,0.1)'
                                    }}>
                                        <Star size={24} color={getTierColor(currentItem.tier)} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '1rem', fontWeight: 'bold', color: getTierColor(resolvedCurrent?.tier || currentItem.tier), display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {resolvedCurrent?.qualityName && resolvedCurrent.qualityName !== 'Normal' ? `${resolvedCurrent.qualityName} ` : ''}{resolvedCurrent?.name || currentItem.name || currentItem.id}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onShowInfo(currentItem); }}
                                                style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: 0.5 }}
                                            >
                                                <Info size={14} color="#fff" />
                                            </button>
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: getTierColor(currentItem.tier) }}>Tier {currentItem.tier} • IP {currentItem.ip || 0}</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { onUnequip(slot); onClose(); }}
                                    style={{
                                        background: 'rgba(255, 68, 68, 0.15)',
                                        color: '#ff4444',
                                        border: '1px solid rgba(255, 68, 68, 0.3)',
                                        borderRadius: '8px',
                                        padding: '8px 16px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
                                        fontSize: '0.8rem',
                                        transition: '0.2s'
                                    }}
                                >
                                    UNEQUIP
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Inventory List */}
                    <div>
                        <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', marginBottom: '10px', fontWeight: 'bold' }}>
                            All Inventory
                        </div>
                        {candidates.length === 0 ? (
                            <div style={{
                                padding: '30px',
                                textAlign: 'center',
                                color: '#555',
                                background: 'rgba(255,255,255,0.02)',
                                borderRadius: '12px',
                                fontSize: '0.9rem'
                            }}>
                                No compatible items found.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {candidates.map((item, idx) => {
                                    const isItemRecommended = isRecommended(item);
                                    return (
                                        <div
                                            key={`${item.id}-${idx}`}
                                            onClick={() => { onEquip(item.id); onClose(); }}
                                            style={{
                                                background: 'rgba(255,255,255,0.03)',
                                                border: `1px solid ${isItemRecommended ? 'rgba(212, 175, 55, 0.3)' : (item.quality > 0 ? item.rarityColor : 'rgba(255,255,255,0.05)')}`,
                                                borderRadius: '12px',
                                                padding: '12px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                                transition: '0.2s',
                                                boxShadow: isItemRecommended ? '0 0 10px rgba(212, 175, 55, 0.05)' : (item.quality > 0 ? `0 0 10px ${item.rarityColor}10` : 'none')
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                <div style={{
                                                    width: '42px',
                                                    height: '42px',
                                                    background: 'rgba(0,0,0,0.3)',
                                                    borderRadius: '8px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: '#aaa',
                                                    position: 'relative',
                                                    border: item.quality > 0 ? `1px solid ${item.rarityColor}55` : 'none'
                                                }}>
                                                    <Star size={20} color={item.quality > 0 ? item.rarityColor : '#aaa'} />
                                                    <div style={{
                                                        position: 'absolute',
                                                        bottom: -5,
                                                        right: -5,
                                                        background: '#333',
                                                        borderRadius: '50%',
                                                        width: '18px',
                                                        height: '18px',
                                                        fontSize: '0.6rem',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        border: '1px solid #555',
                                                        color: '#fff'
                                                    }}>{item.qty}</div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: item.quality > 0 ? item.rarityColor : '#eee', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        {item.qualityName && item.qualityName !== 'Normal' ? `${item.qualityName} ` : ''}{item.name}
                                                        {isItemRecommended && (
                                                            <span style={{ fontSize: '0.6rem', background: 'var(--accent)', color: '#000', padding: '1px 4px', borderRadius: '3px', fontWeight: '900' }}>BEST</span>
                                                        )}
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); onShowInfo(item); }}
                                                            style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: 0.5 }}
                                                        >
                                                            <Info size={14} color="#fff" />
                                                        </button>
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: '#888' }}>Tier {item.tier} {item.ip ? `• IP ${item.ip}` : ''}</div>
                                                </div>
                                            </div>
                                            <div style={{ color: isItemRecommended ? 'var(--accent)' : '#4caf50', fontSize: '0.8rem', fontWeight: 'bold' }}>EQUIP</div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    {/* SPACER ELEMENT TO FIX SCROLL CUTOFF */}
                    <div style={{ minHeight: '40px', flexShrink: 0 }}></div>
                </div>
            </div>
        </div>
    );
};

export default EquipmentSelectModal;
