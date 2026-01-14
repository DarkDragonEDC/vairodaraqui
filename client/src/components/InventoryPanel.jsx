import React, { useState } from 'react';
import { ITEMS, resolveItem, getTierColor } from '../data/items';
import { Package, Coins, Info } from 'lucide-react';
import { Shield } from 'lucide-react';

const InventoryPanel = ({ inventory = {}, socket, silver = 0, onShowInfo, onListOnMarket }) => {
    const [filter, setFilter] = useState('ALL');
    const [sellModal, setSellModal] = useState(null);
    const [selectedItem, setSelectedItem] = useState(null);

    const filterCategories = [
        { id: 'ALL', label: 'All', icon: '📦' },
        { id: 'EQUIPMENT', label: 'Equipment', icon: '⚔️' },
        { id: 'RAW', label: 'Raw Materials', icon: '🪨' },
        { id: 'REFINED', label: 'Refined', icon: '⚡' },
        { id: 'MAPS', label: 'Maps', icon: '🗺️' },
        { id: 'CONSUMABLES', label: 'Consumables', icon: '🍖' }
    ];

    const filteredItems = Object.entries(inventory).filter(([id, amount]) => {
        if (amount <= 0) return false;
        const data = resolveItem(id);
        if (!data) return false;

        if (filter === 'ALL') return true;

        const isGear = ['WEAPON', 'ARMOR', 'HELMET', 'BOOTS', 'GLOVES', 'OFF_HAND', 'TOOL', 'CAPE'].includes(data.type);
        const isFood = data.type === 'FOOD' || id.includes('_FOOD');
        const isMap = data.type === 'MAP';
        const isRaw = id.includes('_WOOD') || id.includes('_ORE') || id.includes('_HIDE') || id.includes('_FIBER') || id.includes('_FISH');
        const isRefined = id.includes('_PLANK') || id.includes('_BAR') || id.includes('_LEATHER') || id.includes('_CLOTH');

        if (filter === 'EQUIPMENT') return isGear;
        if (filter === 'RAW') return isRaw;
        if (filter === 'REFINED') return isRefined;
        if (filter === 'CONSUMABLES') return isFood;
        if (filter === 'MAPS') return isMap;

        return true;
    });

    // Fill up to 50 slots
    const totalSlots = 50;
    const itemsToRender = [...filteredItems];
    while (itemsToRender.length < totalSlots) {
        itemsToRender.push(null);
    }

    const handleSell = () => {
        if (!sellModal) return;
        socket.emit('sell_item', { itemId: sellModal.itemId, quantity: sellModal.quantity });
        setSellModal(null);
    };

    return (
        <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ margin: '0 0 1rem 0', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Inventory</h3>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap', padding: '8px', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '8px' }}>
                {filterCategories.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => { setFilter(cat.id); setSelectedItem(null); }}
                        style={{
                            padding: '6px 12px',
                            fontSize: '0.75rem',
                            border: filter === cat.id ? '1px solid var(--accent)' : '1px solid var(--border)',
                            background: filter === cat.id ? 'rgba(212, 175, 55, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                            color: filter === cat.id ? 'var(--accent)' : 'var(--text-dim)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: filter === cat.id ? 'bold' : 'normal',
                            transition: '0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                    >
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                    </button>
                ))}
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                <span>Slots Used:</span>
                <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{filteredItems.length} / {totalSlots}</span>
            </div>

            {/* Grid */}
            <div className="inventory-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '8px',
                overflowY: 'auto',
                paddingBottom: '20px',
                flex: 1
            }}>
                {itemsToRender.map((entry, index) => {
                    if (!entry) {
                        return (
                            <div key={`empty-${index}`} style={{
                                background: 'rgba(255, 255, 255, 0.02)',
                                borderRadius: '6px',
                                border: '1px solid var(--border)',
                                aspectRatio: '1/1'
                            }} />
                        );
                    }

                    const [id, amount] = entry;
                    const data = resolveItem(id);
                    const tierColor = getTierColor(data.tier || 1);
                    const qualityColor = data.rarityColor || 'var(--border)';
                    const isGear = ['WEAPON', 'ARMOR', 'HELMET', 'BOOTS', 'GLOVES', 'CAPE', 'OFF_HAND', 'TOOL'].includes(data.type);
                    const isSelected = selectedItem === id;

                    // Determine border style based on quality if applicable, otherwise default
                    const borderStyle = data.quality > 0 ? `1px solid ${qualityColor}` : (isSelected ? '1px solid var(--accent)' : '1px solid var(--border)');

                    return (
                        <div key={id}
                            onClick={() => setSelectedItem(isSelected ? null : id)}
                            style={{
                                background: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.05)',
                                padding: '8px',
                                borderRadius: '6px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative',
                                fontSize: '0.65rem',
                                border: borderStyle,
                                aspectRatio: '1/1', // Maintain square aspect ratio
                                cursor: 'pointer',
                                overflow: 'hidden'
                            }}>
                            {/* Info Icon */}
                            <div
                                onClick={(e) => { e.stopPropagation(); onShowInfo(data); }}
                                style={{
                                    position: 'absolute',
                                    top: '4px',
                                    right: '4px',
                                    cursor: 'pointer',
                                    color: 'var(--text-dim)',
                                    zIndex: 2,
                                    background: 'rgba(0, 0, 0, 0.5)',
                                    borderRadius: '50%',
                                    padding: '2px'
                                }}>
                                <Info size={12} />
                            </div>

                            {/* Tier Badge */}
                            <span style={{
                                position: 'absolute',
                                top: '4px',
                                left: '4px',
                                fontWeight: 'bold',
                                color: tierColor
                            }}>
                                T{data.tier}
                            </span>

                            {/* Item Name */}
                            <span style={{
                                textAlign: 'center',
                                overflow: 'hidden',
                                height: '2.4em',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                marginTop: '12px'
                            }}>
                                {data.name}
                            </span>
                            {/* Quality Label (if any) */}
                            {data.quality > 0 && (
                                <span style={{ fontSize: '0.5rem', color: qualityColor, fontWeight: 'bold' }}>
                                    {data.qualityName}
                                </span>
                            )}

                            {/* Quantity */}
                            <div style={{ color: 'var(--accent)', fontWeight: 'bold', marginTop: '4px' }}>
                                x{amount.toLocaleString()}
                            </div>

                            {/* Value */}
                            <div style={{ display: 'flex', gap: '2px', alignItems: 'center', marginTop: '4px', color: 'var(--accent)', fontSize: '0.6rem' }}>
                                <Coins size={10} />
                                {((data.price || 0) * amount).toLocaleString()}
                            </div>

                            {/* Defense Bonus (Example from user input) */}
                            {data.stats?.defense && (
                                <span style={{ marginLeft: '4px', color: 'rgb(33, 150, 243)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                    <Shield size={10} /> {data.stats.defense}
                                </span>
                            )}


                            {/* Actions Overlay */}
                            {isSelected && (
                                <div style={{
                                    display: 'flex',
                                    gap: '4px',
                                    width: '100%',
                                    padding: '4px',
                                    position: 'absolute',
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    background: 'rgba(0,0,0,0.9)',
                                    flexWrap: 'wrap',
                                    justifyContent: 'center',
                                    zIndex: 10,
                                    animation: 'fadeIn 0.2s ease-in-out'
                                }}>
                                    {isGear && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); socket.emit('equip_item', { itemId: id }); setSelectedItem(null); }}
                                            style={{
                                                flex: '1 1 0%',
                                                padding: '6px 2px',
                                                fontSize: '0.6rem',
                                                background: 'var(--accent)',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                color: 'rgb(0, 0, 0)',
                                                fontWeight: 'bold'
                                            }}
                                        >EQUIP</button>
                                    )}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setSellModal({ itemId: id, max: amount, quantity: 1, name: data.name }); setSelectedItem(null); }}
                                        style={{
                                            flex: '1 1 0%',
                                            padding: '6px 2px',
                                            fontSize: '0.6rem',
                                            background: 'rgb(255, 68, 68)',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            color: 'rgb(255, 255, 255)',
                                            fontWeight: 'bold'
                                        }}
                                    >SELL</button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onListOnMarket && onListOnMarket({ itemId: id, max: amount }); setSelectedItem(null); }}
                                        style={{
                                            flex: '1 1 0%',
                                            padding: '6px 2px',
                                            fontSize: '0.6rem',
                                            background: 'var(--accent)',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            color: 'rgb(0, 0, 0)',
                                            fontWeight: 'bold'
                                        }}
                                    >LIST</button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Keep the existing SellModal exactly as is, or rebuild if user's design requires it? 
                User input didn't show the modal code, only the main panel. 
                I'll preserve the modal logic from previous file but wrapped in this new structure.
            */}
            {sellModal && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.8)',
                    zIndex: 200,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(5px)'
                }} onClick={(e) => {
                    if (e.target === e.currentTarget) setSellModal(null);
                }}>
                    <div style={{
                        background: '#1a1a1a',
                        border: '1px solid var(--border)',
                        borderRadius: '16px',
                        padding: '24px',
                        width: '90%',
                        maxWidth: '320px',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
                    }}>
                        <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', color: '#fff', textAlign: 'center' }}>VENDER PARA NPC</h3>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px', background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '10px' }}>
                            <div style={{ padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
                                <Package size={24} color="#d4af37" />
                            </div>
                            <div>
                                <div style={{ fontWeight: 'bold', color: '#fff' }}>{sellModal.name}</div>
                                <div style={{ fontSize: '0.8rem', color: '#888' }}>No inventário: {sellModal.max}</div>
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '8px', fontWeight: 'bold', textTransform: 'uppercase' }}>Quantidade</label>
                            <div style={{ display: 'flex', gap: '5px' }}>
                                <button onClick={() => setSellModal({ ...sellModal, quantity: 1 })} style={{ padding: '10px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '6px', color: '#888', cursor: 'pointer', fontWeight: 'bold' }}>MIN</button>
                                <button onClick={() => setSellModal({ ...sellModal, quantity: Math.max(1, sellModal.quantity - 1) })} style={{ padding: '10px 15px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>-</button>
                                <div style={{ flex: 1, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', color: '#fff', fontWeight: 'bold', fontSize: '1.2rem' }}>
                                    {sellModal.quantity}
                                </div>
                                <button onClick={() => setSellModal({ ...sellModal, quantity: Math.min(sellModal.max, sellModal.quantity + 1) })} style={{ padding: '10px 15px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>+</button>
                                <button onClick={() => setSellModal({ ...sellModal, quantity: sellModal.max })} style={{ padding: '10px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '6px', color: '#888', cursor: 'pointer', fontWeight: 'bold' }}>MAX</button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '10px', background: 'rgba(212, 175, 55, 0.1)', borderRadius: '8px', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
                            <span style={{ fontSize: '0.8rem', color: '#d4af37', fontWeight: 'bold' }}>Valor Estimado:</span>
                            <span style={{ fontSize: '1rem', color: '#fff', fontWeight: 'bold' }}>{(sellModal.quantity * 10).toLocaleString()} <span style={{ fontSize: '0.7rem', color: '#d4af37' }}>Prata</span></span>
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => setSellModal(null)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #333', borderRadius: '8px', color: '#888', cursor: 'pointer', fontWeight: 'bold' }}>Cancelar</button>
                            <button onClick={handleSell} style={{ flex: 1, padding: '12px', background: '#d4af37', border: 'none', borderRadius: '8px', color: '#000', cursor: 'pointer', fontWeight: 'bold' }}>VENDER</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InventoryPanel;
