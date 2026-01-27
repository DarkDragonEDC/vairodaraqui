import React, { useState, useEffect } from 'react';
import { formatNumber, formatSilver } from '@utils/format';
import {
    Tag, ShoppingBag, Package, Search,
    Coins, ArrowRight, User, Info, Trash2,
    Shield, Zap, Apple, Box, Clock, Check, AlertTriangle, X
} from 'lucide-react';
import { resolveItem, getTierColor, formatItemId } from '@shared/items';

const MarketPanel = ({ socket, gameState, silver = 0, onShowInfo, onListOnMarket, isMobile }) => {
    const [activeTab, setActiveTab] = useState('BUY'); // BUY, SELL, LISTINGS, CLAIM
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    const [selectedSubCategory, setSelectedSubCategory] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryOpen, setCategoryOpen] = useState(false);
    const [selectedListing, setSelectedListing] = useState(null); // For buying
    const [buyModal, setBuyModal] = useState(null);
    const [confirmModal, setConfirmModal] = useState(null);
    const [marketListings, setMarketListings] = useState([]);
    const [notification, setNotification] = useState(null);


    // Auto-dismiss notification
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    useEffect(() => {
        // Fetch listings on mount
        socket.emit('get_market_listings');

        const handleUpdate = (newListings) => {
            console.log("Market Listings Updated:", newListings);
            setMarketListings(newListings || []);
        };

        const handleSuccess = (result) => {
            setNotification({ type: 'success', message: result.message || 'Action completed successfully!' });
            socket.emit('get_market_listings');
            setConfirmModal(null);
            setBuyModal(null);
        };

        const handleError = (err) => {
            setNotification({ type: 'error', message: err.message || 'An error occurred.' });
        };

        socket.on('market_listings_update', handleUpdate);
        socket.on('market_action_success', handleSuccess);
        socket.on('error', handleError);

        return () => {
            socket.off('market_listings_update', handleUpdate);
            socket.off('market_action_success', handleSuccess);
            socket.off('error', handleError);
        };
    }, [socket]);

    const handleBuy = (listing) => {
        if (listing.amount === 1) {
            // Direct buying for single items
            setConfirmModal({
                message: 'Are you sure you want to buy this item?',
                subtext: 'Silver will be deducted immediately.',
                onConfirm: () => {
                    socket.emit('buy_market_item', { listingId: listing.id, quantity: 1 });
                    setConfirmModal(null);
                }
            });
        } else {
            // Open partial buy modal
            setBuyModal({
                listing: listing,
                quantity: listing.amount, // Default to MAX
                max: listing.amount,
                pricePerUnit: listing.price / listing.amount
            });
        }
    };

    const handleCancel = (listingId) => {
        setConfirmModal({
            message: 'Cancel this listing?',
            subtext: 'The item will be returned to your Claim tab.',
            onConfirm: () => {
                socket.emit('cancel_listing', { listingId });
                setConfirmModal(null);
            }
        });
    };

    const handleClaim = (claimId) => {
        socket.emit('claim_market_item', { claimId });
    };

    // Helper to check if a listing belongs to the current character
    const isOwnListing = (l) => {
        if (!gameState) return false;
        // Check by Character ID (New listings)
        if (l.seller_character_id && gameState.character_id) {
            if (String(l.seller_character_id) === String(gameState.character_id)) return true;
        }
        // Fallback: Check by Name AND User ID (Legacy listings or missing char ID)
        if (l.seller_name && gameState.name && l.seller_id && gameState.user_id) {
            if (l.seller_name === gameState.name && l.seller_id === gameState.user_id) return true;
        }
        return false;
    };

    // Derived State
    const myOrders = marketListings.filter(l => isOwnListing(l) && l.status !== 'SOLD' && l.status !== 'EXPIRED');
    // Assuming active are those not sold/expired. If server sends only active in updates, this filter might need adjustment.
    // However, usually market listings update implies active listings. 
    // Claims are usually separate. But let's check if the previous code logic implies separation.
    // Previous code: const myOrders = listings.filter(l => l.seller_id === gameState.user_id);
    // It implies everything is in one list. Use that for now.

    // Actually, looking at handleCancel subtext "returned to your Claim tab", implies meaningful status changes.
    // I'll stick to the old simple separation for now to avoid breaking if the server logic expects that.

    const activeListingsForValues = marketListings;


    // Filter Logic for BUY tab
    const activeBuyListings = activeListingsForValues.filter(l => {
        if (isOwnListing(l)) return false; // Hide current character's listings

        const itemName = l.item_data?.name || formatItemId(l.item_id);
        const matchesSearch = itemName.toLowerCase().includes(searchQuery.toLowerCase());

        let matchesCategory = true;
        if (selectedCategory !== 'ALL') {
            if (selectedCategory === 'EQUIPMENT') {
                matchesCategory = ['WEAPON', 'ARMOR', 'HELMET', 'BOOTS', 'OFF_HAND', 'GLOVES', 'CAPE'].includes(l.item_data?.type);
            } else if (selectedCategory === 'RESOURCE') {
                matchesCategory = l.item_data?.type === 'RESOURCE' || l.item_data?.type === 'RAW' || l.item_data?.type === 'REFINED'; // 'REFINED' was separate in old code?
            } else if (selectedCategory === 'REFINED') { // Adding REFINED as per old code
                matchesCategory = l.item_data?.type === 'REFINED';
            } else if (selectedCategory === 'CONSUMABLE') {
                matchesCategory = l.item_data?.type === 'FOOD' || l.item_data?.type === 'POTION';
            }
        }

        return matchesSearch && matchesCategory;
    });

    const myActiveListings = activeListingsForValues.filter(l => isOwnListing(l));


    return (
        <div className="content-area" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="panel" style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                overflow: 'hidden',
                background: 'var(--panel-bg)',
                borderRadius: '12px',
                padding: isMobile ? '15px' : '24px' // Consistent padding
            }}>

                {/* HEADER */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                        <h2 style={{ color: 'var(--accent)', margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Tag size={24} /> MARKETPLACE
                        </h2>
                        <p style={{ margin: '5px 0px 0px', fontSize: '0.8rem', color: 'var(--text-dim)' }}>Shared world trade system</p>
                    </div>

                    {/* TOP TABS */}
                    <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '12px', padding: '4px' }}>
                        <button
                            onClick={() => setActiveTab('BUY')}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: 'bold',
                                background: activeTab === 'BUY' ? 'rgba(212, 175, 55, 0.15)' : 'transparent',
                                color: activeTab === 'BUY' ? 'var(--accent)' : 'var(--text-dim)',
                                border: activeTab === 'BUY' ? '1px solid rgba(212, 175, 55, 0.2)' : '1px solid transparent',
                                transition: '0.2s'
                            }}>
                            Browse
                        </button>
                        <button
                            onClick={() => setActiveTab('MY_ORDERS')}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: 'bold',
                                background: activeTab === 'MY_ORDERS' ? 'rgba(212, 175, 55, 0.15)' : 'transparent',
                                color: activeTab === 'MY_ORDERS' ? 'var(--accent)' : 'var(--text-dim)',
                                border: activeTab === 'MY_ORDERS' ? '1px solid rgba(212, 175, 55, 0.2)' : '1px solid transparent',
                                transition: '0.2s'
                            }}>
                            My Listings
                        </button>
                        <button
                            onClick={() => setActiveTab('SELL')}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: 'bold',
                                background: activeTab === 'SELL' ? 'rgba(212, 175, 55, 0.15)' : 'transparent',
                                color: activeTab === 'SELL' ? 'var(--accent)' : 'var(--text-dim)',
                                border: activeTab === 'SELL' ? '1px solid rgba(212, 175, 55, 0.2)' : '1px solid transparent',
                                transition: '0.2s'
                            }}>
                            Sell
                        </button>
                        <button
                            onClick={() => setActiveTab('CLAIM')}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: 'bold',
                                background: activeTab === 'CLAIM' ? 'rgba(212, 175, 55, 0.15)' : 'transparent',
                                color: activeTab === 'CLAIM' ? 'var(--accent)' : 'var(--text-dim)',
                                border: activeTab === 'CLAIM' ? '1px solid rgba(212, 175, 55, 0.2)' : '1px solid transparent',
                                transition: '0.2s',
                                position: 'relative'
                            }}>
                            Claim
                            {gameState?.state?.claims?.length > 0 && (
                                <span style={{
                                    position: 'absolute',
                                    top: '-2px',
                                    right: '-2px',
                                    background: '#ff4444',
                                    color: '#fff',
                                    borderRadius: '50%',
                                    width: '16px',
                                    height: '16px',
                                    fontSize: '0.65rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>{gameState?.state?.claims?.length}</span>
                            )}
                        </button>
                    </div>
                </div>

                {/* SEARCH AND FILTERS (Only visible in BUY tab) */}
                {activeTab === 'BUY' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                        {/* Search Input */}
                        <div style={{ position: 'relative', width: '100%' }}>
                            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                            <input
                                placeholder="Search items..."
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    width: '100%',
                                    background: 'rgba(0, 0, 0, 0.3)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '8px',
                                    padding: '10px 10px 10px 40px',
                                    color: '#fff',
                                    fontSize: '0.9rem'
                                }}
                            />
                        </div>

                        {/* Filter Buttons */}
                        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '5px', width: '100%' }}>
                            {[
                                { id: 'ALL', label: 'All Items', icon: <ShoppingBag size={14} /> },
                                { id: 'EQUIPMENT', label: 'Equipment', icon: <Shield size={14} /> },
                                { id: 'RESOURCE', label: 'Resources', icon: <Package size={14} /> },
                                { id: 'REFINED', label: 'Refined', icon: <Zap size={14} /> },
                                { id: 'CONSUMABLE', label: 'Consumables', icon: <Apple size={14} /> }
                            ].map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid',
                                        borderColor: selectedCategory === cat.id ? 'var(--accent)' : 'var(--border)',
                                        whiteSpace: 'nowrap',
                                        fontSize: '0.8rem',
                                        fontWeight: '500',
                                        cursor: 'pointer',
                                        background: selectedCategory === cat.id ? 'rgba(212, 175, 55, 0.1)' : 'rgba(0, 0, 0, 0.2)',
                                        color: selectedCategory === cat.id ? 'var(--accent)' : 'var(--text-dim)'
                                    }}
                                >
                                    {cat.icon} {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* CONTENT AREA */}
                <div className="scroll-container" style={{ flex: '1 1 0%', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '5px' }}>

                    {/* View: BUY */}
                    {activeTab === 'BUY' && (
                        <>
                            {activeBuyListings.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-dim)' }}>
                                    <ShoppingBag size={48} style={{ marginBottom: '15px', opacity: 0.3, margin: '0 auto' }} />
                                    <p>No listings found matching your criteria.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
                                    {activeBuyListings.map(l => (
                                        <div key={l.id} style={{
                                            background: 'rgba(255, 255, 255, 0.02)',
                                            borderColor: 'rgba(255, 255, 255, 0.1)',
                                            borderWidth: '1px',
                                            borderStyle: 'solid',
                                            padding: '12px 20px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '15px',
                                            transition: '0.2s',
                                            position: 'relative',
                                            flexWrap: 'wrap',
                                            borderRadius: '8px'
                                        }}>
                                            <div style={{
                                                width: '40px',
                                                height: '40px',
                                                background: 'rgba(0, 0, 0, 0.4)',
                                                borderRadius: '6px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                border: `1px solid ${l.item_data.rarityColor || 'rgba(255, 255, 255, 0.1)'}`,
                                                flexShrink: 0,
                                                position: 'relative',
                                                overflow: 'hidden'
                                            }}>
                                                {l.item_data.icon ? (
                                                    <img src={l.item_data.icon} alt={l.item_data.name} style={{ width: '130%', height: '130%', objectFit: 'contain', opacity: 1.0 }} />
                                                ) : (
                                                    <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#666' }}>T{l.item_data.tier}</span>
                                                )}
                                                <div style={{ position: 'absolute', top: 2, left: 2, fontSize: '0.6rem', fontWeight: '900', color: '#fff', textShadow: '0 0 4px rgba(0,0,0,0.8)' }}>
                                                    T{l.item_data.tier}
                                                </div>
                                            </div>

                                            <div style={{ flex: '2 1 0%', minWidth: '150px' }}>
                                                <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                    <span>{l.item_data.qualityName && l.item_data.qualityName !== 'Normal' ? `${l.item_data.qualityName} ` : ''}{l.item_data.name}</span>
                                                    <button onClick={() => onShowInfo(l.item_data)} style={{ background: 'none', border: 'none', padding: '0', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex' }}>
                                                        <Info size={14} />
                                                    </button>
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px', display: 'flex', gap: '15px' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <User size={12} /> {l.seller_name}
                                                    </span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Clock size={12} /> {new Date(l.created_at).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>

                                            <div style={{ flex: '1 1 0%', textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '120px' }}>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '2px' }}>{l.amount}x units</div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--accent)' }}>
                                                    <Coins size={16} /> {(l.price / l.amount) < 1 ? (l.price / l.amount).toFixed(2) : formatSilver(l.price / l.amount)}
                                                </div>
                                            </div>

                                            <div style={{ marginLeft: '10px' }}>
                                                <button
                                                    onClick={() => handleBuy(l)}
                                                    disabled={silver < (l.price / l.amount)}
                                                    style={{
                                                        padding: '8px 16px',
                                                        borderRadius: '6px',
                                                        border: 'none',
                                                        cursor: silver < (l.price / l.amount) ? 'not-allowed' : 'pointer',
                                                        background: silver < (l.price / l.amount) ? 'rgba(255, 255, 255, 0.05)' : 'rgba(76, 175, 80, 0.15)',
                                                        color: silver < (l.price / l.amount) ? 'var(--text-dim)' : '#4caf50',
                                                        fontWeight: 'bold',
                                                        fontSize: '0.8rem',
                                                        minWidth: '100px',
                                                        border: `1px solid ${silver < (l.price / l.amount) ? 'transparent' : 'rgba(76, 175, 80, 0.3)'}`
                                                    }}
                                                >
                                                    {silver < (l.price / l.amount) ? 'No Funds' : 'BUY'}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {/* View: SELL */}
                    {activeTab === 'SELL' && (
                        <>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: isMobile ? 'repeat(auto-fill, minmax(80px, 1fr))' : 'repeat(5, 1fr)',
                                gap: isMobile ? '8px' : '12px',
                                paddingBottom: '100px'
                            }}>
                                {Object.entries(gameState?.state?.inventory || {}).filter(([id, qty]) => {
                                    const data = resolveItem(id);
                                    if (!data) return false;
                                    // Exclude Quest items or explicit non-tradable items if any
                                    if (data.type === 'QUEST') return false;
                                    return true;
                                }).map(([id, qty]) => {
                                    const data = resolveItem(id);
                                    const tierColor = getTierColor(data.tier);

                                    return (
                                        <button
                                            key={id}
                                            onClick={() => onListOnMarket({ itemId: id, max: qty })}
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
                                                transition: '0.2s'
                                            }}
                                        >
                                            <div style={{ position: 'absolute', top: 6, left: 6, fontSize: '0.6rem', color: '#fff', fontWeight: '900', textShadow: '0 0 4px rgba(0,0,0,0.8)' }}>T{data.tier}</div>
                                            <div style={{ position: 'absolute', top: 6, right: 6, fontSize: '0.7rem', color: '#fff', fontWeight: 'bold' }}>x{qty}</div>

                                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', overflow: 'hidden' }}>
                                                {data.icon ? (
                                                    <img src={data.icon} alt={data.name} style={{ width: '130%', height: '130%', objectFit: 'contain' }} />
                                                ) : (
                                                    <Package size={32} color="#666" style={{ opacity: 0.8 }} />
                                                )}
                                            </div>

                                            <div style={{ fontSize: '0.7rem', color: '#aaa', fontWeight: 'bold', textAlign: 'center', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {data.name}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                        </>
                    )}

                    {/* View: MY LISTINGS */}
                    {activeTab === 'MY_ORDERS' && (
                        <>
                            {myOrders.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-dim)' }}>
                                    <Tag size={48} style={{ marginBottom: '15px', opacity: 0.3, margin: '0 auto' }} />
                                    <p>You have no active listings.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
                                    {myOrders.map(l => (
                                        <div key={l.id} style={{
                                            background: 'rgba(255, 255, 255, 0.02)',
                                            borderColor: 'rgba(255, 255, 255, 0.1)',
                                            borderWidth: '1px',
                                            borderStyle: 'solid',
                                            padding: '12px 20px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '15px',
                                            transition: '0.2s',
                                            position: 'relative',
                                            flexWrap: 'wrap',
                                            borderRadius: '8px'
                                        }}>
                                            <div style={{
                                                width: '40px',
                                                height: '40px',
                                                background: 'rgba(0, 0, 0, 0.4)',
                                                borderRadius: '6px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                border: `1px solid ${l.item_data.rarityColor || 'rgba(255, 255, 255, 0.1)'}`,
                                                flexShrink: 0,
                                                position: 'relative',
                                                overflow: 'hidden'
                                            }}>
                                                {l.item_data.icon ? (
                                                    <img src={l.item_data.icon} alt={l.item_data.name} style={{ width: '130%', height: '130%', objectFit: 'contain', opacity: 1.0 }} />
                                                ) : (
                                                    <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#666' }}>T{l.item_data.tier}</span>
                                                )}
                                                <div style={{ position: 'absolute', top: 2, left: 2, fontSize: '0.6rem', fontWeight: '900', color: '#fff', textShadow: '0 0 4px rgba(0,0,0,0.8)' }}>
                                                    T{l.item_data.tier}
                                                </div>
                                            </div>

                                            <div style={{ flex: '2 1 0%', minWidth: '150px' }}>
                                                <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                    <span>{l.item_data.qualityName && l.item_data.qualityName !== 'Normal' ? `${l.item_data.qualityName} ` : ''}{l.item_data.name}</span>
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px', display: 'flex', gap: '15px' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Clock size={12} /> {new Date(l.created_at).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>

                                            <div style={{ flex: '1 1 0%', textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '120px' }}>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '2px' }}>{l.amount}x units</div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--accent)' }}>
                                                    <Coins size={16} /> {formatSilver(l.price)}
                                                </div>
                                            </div>

                                            <div style={{ marginLeft: '10px' }}>
                                                <button
                                                    onClick={() => handleCancel(l.id)}
                                                    style={{
                                                        padding: '8px 16px',
                                                        borderRadius: '6px',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        background: 'rgba(255, 68, 68, 0.1)',
                                                        color: '#ff4444',
                                                        fontWeight: 'bold',
                                                        fontSize: '0.8rem',
                                                        minWidth: '100px',
                                                        border: '1px solid rgba(255, 68, 68, 0.3)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '5px'
                                                    }}
                                                >
                                                    <Trash2 size={12} /> CANCEL
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {/* View: CLAIM */}
                    {activeTab === 'CLAIM' && (
                        <>
                            {(!gameState?.state?.claims || gameState.state.claims.length === 0) ? (
                                <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-dim)' }}>
                                    <ShoppingBag size={48} style={{ marginBottom: '15px', opacity: 0.3, margin: '0 auto' }} />
                                    <p>Nothing to claim.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
                                    {gameState?.state?.claims?.map(c => {
                                        let isItem = c.type === 'BOUGHT_ITEM' || c.type === 'CANCELLED_LISTING' || c.type === 'SOLD_ITEM';
                                        let name = c.name || 'Item';
                                        let icon = <Coins size={24} color="var(--accent)" />;
                                        let tierColor = '#fff';

                                        if (isItem && c.itemId) {
                                            const data = resolveItem(c.itemId);
                                            if (data) {
                                                tierColor = getTierColor(data.tier);
                                                const qualityPrefix = data.qualityName && data.qualityName !== 'Normal' ? `${data.qualityName} ` : '';

                                                if (c.type === 'SOLD_ITEM') {
                                                    name = `Sold: ${qualityPrefix}${data.name}`;
                                                } else {
                                                    name = `${qualityPrefix}${data.name}`;
                                                }

                                                if (c.type !== 'SOLD_ITEM') {
                                                    if (data.icon) {
                                                        icon = <img src={data.icon} alt={data.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />;
                                                    } else {
                                                        icon = <Package size={24} color="#666" style={{ opacity: 0.8 }} />;
                                                    }
                                                }
                                            }
                                        }

                                        return (
                                            <div key={c.id} style={{
                                                background: 'rgba(255, 255, 255, 0.02)',
                                                borderColor: 'rgba(255, 255, 255, 0.1)',
                                                borderWidth: '1px',
                                                borderStyle: 'solid',
                                                padding: '12px 20px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '15px',
                                                transition: '0.2s',
                                                position: 'relative',
                                                flexWrap: 'wrap',
                                                borderRadius: '8px'
                                            }}>
                                                <div style={{
                                                    width: '40px',
                                                    height: '40px',
                                                    background: 'rgba(0, 0, 0, 0.4)',
                                                    borderRadius: '6px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    border: isItem ? `1px solid ${tierColor}` : '1px solid var(--accent)',
                                                    flexShrink: 0,
                                                    overflow: 'hidden'
                                                }}>
                                                    {isItem && icon.props?.style ? React.cloneElement(icon, { style: { ...icon.props.style, width: '130%', height: '130%', objectFit: 'contain' } }) : icon}
                                                </div>
                                                <div style={{ flex: '2 1 0%', minWidth: '150px' }}>
                                                    <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                        <span>{name}</span>
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px', display: 'flex', gap: '15px' }}>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <Clock size={12} /> {new Date(c.timestamp).toLocaleString()}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div style={{ flex: '1 1 0%', textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '120px' }}>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '2px' }}>
                                                        {c.type === 'SOLD_ITEM' && `Quantity: ${c.amount}`}
                                                        {c.type === 'BOUGHT_ITEM' && `Bought x${c.amount}`}
                                                        {c.type === 'CANCELLED_LISTING' && `Retrieved x${c.amount}`}
                                                    </div>
                                                    {c.silver ? (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--accent)' }}>
                                                            <Coins size={16} /> +{formatSilver(c.silver)}
                                                        </div>
                                                    ) : (
                                                        <div style={{ height: '24px' }}></div>
                                                    )}
                                                </div>

                                                <div style={{ marginLeft: '10px' }}>
                                                    <button
                                                        onClick={() => {
                                                            // Direct claim without confirm as receiving items is always good
                                                            handleClaim(c.id);
                                                        }}
                                                        style={{
                                                            padding: '8px 16px',
                                                            borderRadius: '6px',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            background: 'rgba(76, 175, 80, 0.15)',
                                                            color: '#4caf50',
                                                            fontWeight: 'bold',
                                                            fontSize: '0.8rem',
                                                            minWidth: '100px',
                                                            border: '1px solid rgba(76, 175, 80, 0.3)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '5px'
                                                        }}
                                                    >
                                                        CLAIM
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}

                </div>

                {/* NOTIFICATIONS */}
                {
                    notification && (
                        <div style={{
                            position: 'absolute',
                            bottom: '20px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: notification.type === 'error' ? 'rgba(255, 68, 68, 0.9)' : 'rgba(76, 175, 80, 0.9)',
                            color: '#fff',
                            padding: '12px 24px',
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            zIndex: 100,
                            backdropFilter: 'blur(4px)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            minWidth: '300px',
                            justifyContent: 'center'
                        }}>
                            {notification.type === 'error' ? <AlertTriangle size={20} /> : <Check size={20} />}
                            <span style={{ fontWeight: '500' }}>{notification.message}</span>
                        </div>
                    )
                }

                {/* CONFIRM MODAL (Simple) */}
                {
                    confirmModal && (
                        <div style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0,0,0,0.8)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 3000,
                            backdropFilter: 'blur(2px)'
                        }} onClick={(e) => {
                            if (e.target === e.currentTarget) setConfirmModal(null);
                        }}>
                            <div style={{
                                background: '#1a1a1a',
                                border: '1px solid var(--border)',
                                borderRadius: '12px',
                                padding: '24px',
                                width: '90%',
                                maxWidth: '400px',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                            }}>
                                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', color: '#fff' }}>{confirmModal.message}</h3>
                                {confirmModal.subtext && <p style={{ margin: '0 0 20px 0', color: 'var(--text-dim)', fontSize: '0.9rem' }}>{confirmModal.subtext}</p>}

                                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                    <button
                                        onClick={() => setConfirmModal(null)}
                                        style={{
                                            padding: '10px 20px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--border)',
                                            background: 'transparent',
                                            color: 'var(--text-dim)',
                                            cursor: 'pointer',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmModal.onConfirm}
                                        style={{
                                            padding: '10px 20px',
                                            borderRadius: '8px',
                                            border: 'none',
                                            background: 'var(--accent)',
                                            color: '#000',
                                            cursor: 'pointer',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        Confirm
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* BUY MODAL (Partial Quantity) */}
                {
                    buyModal && (
                        <div style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0,0,0,0.8)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 3000,
                            backdropFilter: 'blur(2px)'
                        }} onClick={(e) => {
                            if (e.target === e.currentTarget) setBuyModal(null);
                        }}>
                            <div style={{
                                background: '#1a1a1a',
                                border: '1px solid var(--border)',
                                borderRadius: '12px',
                                padding: '24px',
                                width: '90%',
                                maxWidth: '450px',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                            }}>
                                <h3 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>Buy {buyModal.listing.item_data.qualityName && buyModal.listing.item_data.qualityName !== 'Normal' ? `${buyModal.listing.item_data.qualityName} ` : ''}{buyModal.listing.item_data.name}</span>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 'normal' }}>
                                        {buyModal.max} available
                                    </span>
                                </h3>
                                <p style={{ margin: '0 0 20px 0', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                                    Price per unit: <span style={{ color: 'var(--accent)' }}>
                                        {buyModal.pricePerUnit < 1 ? buyModal.pricePerUnit.toFixed(2) : formatNumber(Math.floor(buyModal.pricePerUnit))} silver
                                    </span>
                                </p>

                                {/* Quantity Selector */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                                    <button
                                        onClick={() => setBuyModal(prev => ({ ...prev, quantity: Math.max(1, prev.quantity - 1) }))}
                                        style={{
                                            width: '40px', height: '40px', borderRadius: '8px', border: '1px solid var(--border)',
                                            background: 'rgba(255,255,255,0.05)', color: '#fff', cursor: 'pointer', fontSize: '1.2rem'
                                        }}
                                    >-</button>

                                    <div style={{ flex: 1, position: 'relative' }}>
                                        <input
                                            type="number"
                                            value={buyModal.quantity}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === '') {
                                                    setBuyModal(prev => ({ ...prev, quantity: '' }));
                                                } else {
                                                    const parsed = parseInt(val);
                                                    if (!isNaN(parsed)) {
                                                        // Clamp between 1 and max
                                                        const clamped = Math.max(1, Math.min(buyModal.max, parsed));
                                                        setBuyModal(prev => ({ ...prev, quantity: clamped }));
                                                    }
                                                }
                                            }}
                                            onBlur={() => {
                                                if (buyModal.quantity === '' || buyModal.quantity === 0) {
                                                    setBuyModal(prev => ({ ...prev, quantity: 1 }));
                                                }
                                            }}
                                            style={{
                                                width: '100%',
                                                textAlign: 'center',
                                                background: 'rgba(0,0,0,0.3)',
                                                border: '1px solid var(--border)',
                                                borderRadius: '8px',
                                                padding: '10px',
                                                color: '#fff',
                                                fontSize: '1.1rem',
                                                fontWeight: 'bold'
                                            }}
                                        />
                                    </div>

                                    <button
                                        onClick={() => setBuyModal(prev => ({ ...prev, quantity: Math.min(prev.max, prev.quantity + 1) }))}
                                        style={{
                                            width: '40px', height: '40px', borderRadius: '8px', border: '1px solid var(--border)',
                                            background: 'rgba(255,255,255,0.05)', color: '#fff', cursor: 'pointer', fontSize: '1.2rem'
                                        }}
                                    >+</button>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                    <button
                                        onClick={() => setBuyModal(prev => ({ ...prev, quantity: 1 }))}
                                        style={{ fontSize: '0.8rem', padding: '4px 8px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-dim)', cursor: 'pointer' }}
                                    >MIN (1)</button>
                                    <button
                                        onClick={() => {
                                            const affordable = Math.floor(silver / buyModal.pricePerUnit);
                                            const maxAmount = Math.max(1, Math.min(buyModal.max, affordable));
                                            setBuyModal(prev => ({ ...prev, quantity: maxAmount }));
                                        }}
                                        style={{ fontSize: '0.8rem', padding: '4px 8px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-dim)', cursor: 'pointer' }}
                                    >MAX ({buyModal.max})</button>
                                </div>

                                {/* Financial Summary */}
                                <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '15px', marginBottom: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-dim)' }}>
                                        <span>Current Silver:</span>
                                        <span style={{ color: '#fff' }}>{silver ? formatNumber(silver) : 0}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-dim)' }}>
                                        <span>Total Cost:</span>
                                        <span style={{ color: '#ff4444' }}>- {formatNumber(Math.floor(buyModal.pricePerUnit * buyModal.quantity))}</span>
                                    </div>
                                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '8px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                                        <span>Remaining:</span>
                                        <span style={{ color: (silver - Math.floor(buyModal.pricePerUnit * buyModal.quantity)) < 0 ? '#ff4444' : '#4caf50' }}>
                                            {formatNumber(silver - Math.floor(buyModal.pricePerUnit * buyModal.quantity))}
                                        </span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                    <button
                                        onClick={() => setBuyModal(null)}
                                        style={{
                                            padding: '12px 24px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--border)',
                                            background: 'transparent',
                                            color: 'var(--text-dim)',
                                            cursor: 'pointer',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => {
                                            const qtyToSend = Number(buyModal.quantity) || 1;
                                            if (silver >= Math.floor(buyModal.pricePerUnit * qtyToSend)) {
                                                socket.emit('buy_market_item', { listingId: buyModal.listing.id, quantity: qtyToSend });
                                            }
                                        }}
                                        disabled={silver < Math.floor(buyModal.pricePerUnit * (Number(buyModal.quantity) || 1))}
                                        style={{
                                            padding: '12px 24px',
                                            borderRadius: '8px',
                                            border: 'none',
                                            background: silver < Math.floor(buyModal.pricePerUnit * (Number(buyModal.quantity) || 1)) ? 'rgba(255,255,255,0.1)' : 'var(--accent)',
                                            color: silver < Math.floor(buyModal.pricePerUnit * (Number(buyModal.quantity) || 1)) ? 'var(--text-dim)' : '#000',
                                            cursor: silver < Math.floor(buyModal.pricePerUnit * (Number(buyModal.quantity) || 1)) ? 'not-allowed' : 'pointer',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        Confirm Buy
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }
            </div >
        </div >
    );
};

export default MarketPanel;
