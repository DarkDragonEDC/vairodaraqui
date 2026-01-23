import React, { useState } from 'react';
import { resolveItem, getTierColor, calculateItemSellPrice } from '@shared/items';
import { Package, Shield, Coins, Tag, Trash2, Info } from 'lucide-react';
import ItemActionModal from './ItemActionModal';

const InventoryPanel = ({ gameState, socket, onEquip, onListOnMarket, onShowInfo, isMobile }) => {
    const [selectedItemForModal, setSelectedItemForModal] = useState(null);
    const [sellModal, setSellModal] = useState(null);
    const [filter, setFilter] = useState('ALL');

    const handleItemClick = (item) => {
        setSelectedItemForModal(item);
    };

    const handleQuickSell = (itemId) => {
        const item = resolveItem(itemId);
        if (!item) return;

        const unitPrice = calculateItemSellPrice(item, itemId);

        setSellModal({
            itemId,
            item,
            max: gameState?.state?.inventory?.[itemId] || 0,
            quantity: gameState?.state?.inventory?.[itemId] || 1,
            unitPrice
        });
    };

    const inventoryItems = Object.entries(gameState?.state?.inventory || {}).map(([id, qty]) => {
        const item = resolveItem(id);
        if (!item || qty <= 0) return null;
        return { ...item, qty, id }; // id is key
    }).filter(Boolean);

    const filteredItems = inventoryItems.filter(item => {
        if (filter === 'ALL') return true;

        // Categoria Simplificada
        const isGear = ['WEAPON', 'ARMOR', 'HELMET', 'BOOTS', 'GLOVES', 'OFF_HAND', 'TOOL', 'CAPE'].includes(item.type);
        const isRaw = ['RESOURCE', 'RAW'].includes(item.type) || item.id.includes('_ORE') || item.id.includes('_WOOD'); // Fallback
        const isConsumable = ['FOOD', 'POTION'].includes(item.type);

        if (filter === 'EQUIPMENT') return isGear;
        if (filter === 'RESOURCE') return isRaw;
        if (filter === 'CONSUMABLE') return isConsumable;
        return true;
    });

    const totalSlots = 50;
    const itemsToRender = [...filteredItems];
    while (itemsToRender.length < totalSlots) {
        itemsToRender.push(null);
    }

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{
                display: 'flex',
                gap: '10px',
                padding: '10px 0',
                overflowX: 'auto',
                borderBottom: '1px solid var(--border)',
                marginBottom: '10px'
            }}>
                {/* Filter Tabs */}
                {['ALL', 'EQUIPMENT', 'RESOURCE', 'CONSUMABLE'].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: 'none',
                            background: filter === f ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                            color: filter === f ? '#000' : 'var(--text-dim)',
                            fontWeight: 'bold',
                            fontSize: '0.75rem',
                            cursor: 'pointer'
                        }}
                    >
                        {f}
                    </button>
                ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                <span>Slots Used:</span>
                <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{inventoryItems.length} / {totalSlots}</span>
            </div>




            <div className="scroll-container" style={{ flex: 1, paddingRight: '5px', overflowY: 'auto' }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? 'repeat(auto-fill, minmax(80px, 1fr))' : 'repeat(4, minmax(0, 1fr))',
                    gap: '8px',
                    paddingBottom: '80px'
                }}>
                    {itemsToRender.map((item, index) => {
                        if (!item) {
                            return (
                                <div key={`empty-${index}`} style={{
                                    background: 'rgba(255, 255, 255, 0.02)',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border)',
                                    aspectRatio: '1/1',
                                    minHeight: '80px'
                                }} />
                            );
                        }

                        const tierColor = getTierColor(item.tier);
                        const borderColor = item.rarityColor || 'transparent';

                        return (
                            <div
                                key={item.id}
                                onClick={() => handleItemClick(item)}
                                style={{
                                    aspectRatio: '1/1',
                                    background: 'rgba(0,0,0,0.3)',
                                    borderRadius: '12px',
                                    border: borderColor !== 'transparent' ? `1px solid ${borderColor}` : '1px solid rgba(255,255,255,0.05)',
                                    position: 'relative',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: '0.2s',
                                    minHeight: '80px',
                                    boxShadow: borderColor !== 'transparent' ? `0 0 10px ${borderColor}33` : 'none'
                                }}
                            >
                                <div style={{ position: 'absolute', top: 4, left: 4, fontSize: '0.6rem', fontWeight: 'bold', color: tierColor }}>
                                    T{item.tier}
                                </div>
                                <div style={{ position: 'absolute', top: 4, right: 4, fontSize: '0.65rem', fontWeight: 'bold', color: '#fff' }}>
                                    x{item.qty}
                                </div>
                                <div
                                    style={{
                                        position: 'absolute',
                                        bottom: 2,
                                        right: 4,
                                        opacity: 0.6,
                                        cursor: 'help',
                                        zIndex: 10
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onShowInfo(item);
                                    }}
                                >
                                    <Info size={12} color="#fff" />
                                </div>

                                <Package size={28} color={tierColor} />

                                <div style={{
                                    marginTop: '4px',
                                    fontSize: '0.65rem',
                                    textAlign: 'center',
                                    color: '#ccc',
                                    width: '90%',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }}>
                                    {item.name}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Action Modal */}
            {selectedItemForModal && (
                <ItemActionModal
                    item={selectedItemForModal}
                    onClose={() => setSelectedItemForModal(null)}
                    onEquip={onEquip}
                    onSell={(id) => { setSelectedItemForModal(null); handleQuickSell(id); }}
                    onList={(id, item) => { setSelectedItemForModal(null); onListOnMarket({ itemId: id, max: item.qty }); }}
                />
            )}

            {/* Quick Sell Confirmation Modal */}
            {sellModal && (
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)',
                    zIndex: 200,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(8px)'
                }} onClick={() => setSellModal(null)}>
                    <div style={{
                        background: '#1a1a1a',
                        border: '1px solid rgba(255, 215, 0, 0.3)',
                        borderRadius: '16px',
                        padding: '24px',
                        width: '90%',
                        maxWidth: '320px',
                        boxShadow: '0 0 30px rgba(0,0,0,0.5)'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>Sell {sellModal.item.name}</h3>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                                Unit Price: <span style={{ color: '#ffd700', fontWeight: 'bold' }}>{sellModal.unitPrice} Silver</span>
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.75rem' }}>
                                <span style={{ color: 'var(--text-dim)' }}>Quantity:</span>
                                <span style={{ color: '#fff', fontWeight: 'bold' }}>Max: {sellModal.max}</span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button
                                    onClick={() => setSellModal({ ...sellModal, quantity: 1 })}
                                    style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#ccc', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.7rem' }}
                                >
                                    MIN
                                </button>

                                <button
                                    onClick={() => setSellModal({ ...sellModal, quantity: Math.max(1, sellModal.quantity - 1) })}
                                    style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                    -
                                </button>

                                <input
                                    type="number"
                                    min="1"
                                    max={sellModal.max}
                                    value={sellModal.quantity}
                                    onChange={(e) => {
                                        let val = parseInt(e.target.value);
                                        if (isNaN(val)) val = 1;
                                        if (val < 1) val = 1;
                                        if (val > sellModal.max) val = sellModal.max;
                                        setSellModal({ ...sellModal, quantity: val });
                                    }}
                                    style={{
                                        flex: 1,
                                        background: 'rgba(0,0,0,0.3)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '6px',
                                        color: '#fff',
                                        padding: '8px',
                                        textAlign: 'center',
                                        fontWeight: 'bold',
                                        fontSize: '1rem',
                                        outline: 'none'
                                    }}
                                />

                                <button
                                    onClick={() => setSellModal({ ...sellModal, quantity: Math.min(sellModal.max, sellModal.quantity + 1) })}
                                    style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                    +
                                </button>

                                <button
                                    onClick={() => setSellModal({ ...sellModal, quantity: sellModal.max })}
                                    style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#ccc', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.7rem' }}
                                >
                                    MAX
                                </button>
                            </div>

                            <input
                                type="range"
                                min="1"
                                max={sellModal.max}
                                value={sellModal.quantity}
                                onChange={(e) => setSellModal({ ...sellModal, quantity: parseInt(e.target.value) })}
                                style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer', marginTop: '15px' }}
                            />
                        </div>

                        <div style={{
                            background: 'rgba(255, 215, 0, 0.05)',
                            border: '1px solid rgba(255, 215, 0, 0.1)',
                            borderRadius: '8px',
                            padding: '12px',
                            textAlign: 'center',
                            marginBottom: '20px'
                        }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Profit</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#ffd700' }}>
                                <Coins size={18} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                                {(sellModal.unitPrice * sellModal.quantity).toLocaleString()}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => setSellModal(null)}
                                style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#888', borderRadius: '8px', fontWeight: 'bold' }}
                            >
                                CANCEL
                            </button>
                            <button
                                onClick={() => {
                                    socket.emit('sell_item', { itemId: sellModal.itemId, quantity: sellModal.quantity });
                                    setSellModal(null);
                                }}
                                style={{ flex: 1, padding: '12px', background: 'var(--accent)', border: 'none', color: '#000', borderRadius: '8px', fontWeight: 'bold' }}
                            >
                                SELL NOW
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InventoryPanel;
