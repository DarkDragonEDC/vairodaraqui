import React, { useState } from 'react';
import { resolveItem, getTierColor, calculateItemSellPrice } from '@shared/items';
import { Package, Shield, Coins, Tag, Trash2, Info, ChevronDown, ChevronUp, ArrowUpAZ, ArrowDownZA, Search } from 'lucide-react';
import ItemActionModal from './ItemActionModal';

const InventoryPanel = ({ gameState, socket, onEquip, onListOnMarket, onShowInfo, isMobile }) => {
    const [selectedItemForModal, setSelectedItemForModal] = useState(null);
    const [sellModal, setSellModal] = useState(null);
    const [filter, setFilter] = useState('ALL');
    const [sortBy, setSortBy] = useState('NAME'); // NAME, QUALITY, QUANTITY, TYPE, VALUE, DATE
    const [sortDir, setSortDir] = useState('asc');
    const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

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
        // Category Filter
        if (filter !== 'ALL') {
            const isGear = ['WEAPON', 'ARMOR', 'HELMET', 'BOOTS', 'GLOVES', 'OFF_HAND', 'CAPE'].includes(item.type) || item.type.startsWith('TOOL');
            const isRaw = ['RESOURCE', 'RAW'].includes(item.type) || item.id.includes('_ORE') || item.id.includes('_WOOD');
            const isConsumable = ['FOOD', 'POTION'].includes(item.type);

            if (filter === 'EQUIPMENT' && !isGear) return false;
            if (filter === 'RESOURCE' && !isRaw) return false;
            if (filter === 'CONSUMABLE' && !isConsumable) return false;
        }

        // Search Filter
        if (searchQuery) {
            return item.name.toLowerCase().includes(searchQuery.toLowerCase());
        }
        return true;
    });

    // Sorting Logic
    const sortedItems = [...filteredItems].sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
            case 'NAME':
                comparison = a.name.localeCompare(b.name);
                break;
            case 'QUALITY':
                comparison = (a.quality || 0) - (b.quality || 0);
                break;
            case 'QUANTITY':
                comparison = a.qty - b.qty;
                break;
            case 'TYPE':
                comparison = a.type.localeCompare(b.type);
                break;
            case 'VALUE':
                const valA = calculateItemSellPrice(a, a.id);
                const valB = calculateItemSellPrice(b, b.id);
                comparison = valA - valB;
                break;
            case 'DATE':
                // Using index in the original inventory as a proxy for acquisition date if not stored
                const indexA = Object.keys(gameState?.state?.inventory || {}).indexOf(a.id);
                const indexB = Object.keys(gameState?.state?.inventory || {}).indexOf(b.id);
                comparison = indexA - indexB;
                break;
        }
        return sortDir === 'asc' ? comparison : -comparison;
    });

    const totalSlots = 50;
    const itemsToRender = [...sortedItems];
    while (itemsToRender.length < totalSlots) {
        itemsToRender.push(null);
    }

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                padding: '10px 0',
                borderBottom: '1px solid var(--border)',
                marginBottom: '10px'
            }}>
                {/* Row 1: Categories */}
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
                    {['ALL', 'EQUIPMENT', 'RESOURCE', 'CONSUMABLE'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                background: filter === f ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255,255,255,0.05)',
                                color: filter === f ? 'var(--accent)' : 'var(--text-dim)',
                                border: filter === f ? '1px solid rgba(212, 175, 55, 0.3)' : '1px solid transparent',
                                fontWeight: 'bold',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                transition: '0.2s',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                {/* Row 2: Search & Sort */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', opacity: 0.6 }} />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                padding: '8px 10px 8px 32px',
                                color: '#fff',
                                fontSize: '0.8rem',
                                outline: 'none',
                                transition: '0.2s'
                            }}
                        />
                    </div>

                    {/* Sort Dropdown */}
                    <div style={{ position: 'relative', width: isMobile ? '100px' : '120px', flexShrink: 0 }}>
                        <button
                            onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                padding: '8px 10px',
                                color: '#fff',
                                fontSize: '0.75rem',
                                cursor: 'pointer'
                            }}
                        >
                            <span style={{ color: 'var(--text-dim)', marginRight: '4px' }}>By:</span>
                            <span style={{ fontWeight: 'bold' }}>{sortBy.charAt(0) + sortBy.slice(1).toLowerCase()}</span>
                            <ChevronDown size={12} style={{ marginLeft: 'auto', opacity: 0.6, transform: isSortMenuOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                        </button>

                        {isSortMenuOpen && (
                            <>
                                <div
                                    onClick={() => setIsSortMenuOpen(false)}
                                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }}
                                />
                                <div style={{
                                    position: 'absolute',
                                    top: 'calc(100% + 5px)',
                                    right: 0,
                                    width: '120px',
                                    background: '#1a1a2e',
                                    border: '1px solid var(--border)',
                                    borderRadius: '8px',
                                    padding: '5px',
                                    zIndex: 101,
                                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                                }}>
                                    {['DATE', 'QUALITY', 'QUANTITY', 'TYPE', 'VALUE', 'NAME'].map(opt => (
                                        <button
                                            key={opt}
                                            onClick={() => { setSortBy(opt); setIsSortMenuOpen(false); }}
                                            style={{
                                                width: '100%',
                                                padding: '8px 12px',
                                                textAlign: 'left',
                                                background: sortBy === opt ? 'rgba(255,255,255,0.05)' : 'transparent',
                                                border: 'none',
                                                color: sortBy === opt ? 'var(--accent)' : '#fff',
                                                fontSize: '0.75rem',
                                                cursor: 'pointer',
                                                borderRadius: '4px'
                                            }}
                                        >
                                            {opt.charAt(0) + opt.slice(1).toLowerCase()}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Sort Direction Toggle */}
                    <button
                        onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}
                        style={{
                            padding: '8px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            color: 'var(--accent)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}
                        title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
                    >
                        {sortDir === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', fontSize: '0.75rem', color: 'var(--text-dim)', padding: '0 5px' }}>
                <span>Slots Used:</span>
                <span style={{ color: 'var(--accent)', opacity: 0.8, fontWeight: 'bold' }}>{inventoryItems.length} / {totalSlots}</span>
            </div>




            <div className="scroll-container" style={{ flex: 1, paddingRight: '5px', overflowY: 'auto' }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? 'repeat(auto-fill, minmax(80px, 1fr))' : 'repeat(5, 1fr)',
                    gap: isMobile ? '8px' : '12px',
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
                                    background: 'rgba(0,0,0,0.2)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '10px',
                                    padding: '10px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    aspectRatio: '1/1',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    transition: '0.2s',
                                    minHeight: '80px'
                                }}
                            >
                                <div style={{ position: 'absolute', top: 6, left: 6, fontSize: '0.6rem', color: '#fff', fontWeight: '900', textShadow: '0 0 4px rgba(0,0,0,0.8)' }}>T{item.tier}</div>
                                <div style={{ position: 'absolute', top: 6, right: 6, fontSize: '0.7rem', color: '#fff', fontWeight: 'bold' }}>x{item.qty}</div>

                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', overflow: 'hidden' }}>
                                    {item.icon ? (
                                        <img src={item.icon} alt={item.name} style={{ width: item.scale || '130%', height: item.scale || '130%', objectFit: 'contain' }} />
                                    ) : (
                                        <Package size={32} color="#666" style={{ opacity: 0.8 }} />
                                    )}
                                </div>

                                <div style={{ fontSize: '0.7rem', color: '#aaa', fontWeight: 'bold', textAlign: 'center', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {item.name}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Action Modal */}
            {
                selectedItemForModal && (
                    <ItemActionModal
                        item={selectedItemForModal}
                        onClose={() => setSelectedItemForModal(null)}
                        onEquip={onEquip}
                        onSell={(id) => { setSelectedItemForModal(null); handleQuickSell(id); }}
                        onList={(id, item) => { setSelectedItemForModal(null); onListOnMarket({ itemId: id, max: item.qty }); }}
                    />
                )
            }

            {/* Quick Sell Confirmation Modal */}
            {
                sellModal && (
                    <div style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.8)',
                        zIndex: 2000,
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
                )
            }
        </div >
    );
};

export default InventoryPanel;
