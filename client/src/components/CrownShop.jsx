import React, { useState, useEffect } from 'react';
import { X, Crown, Zap, Package, Sparkles, Star, ShoppingBag, Check } from 'lucide-react';

const CrownShop = ({ socket, gameState, onClose }) => {
    const [storeItems, setStoreItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState(null);
    const [purchaseResult, setPurchaseResult] = useState(null);

    const crowns = gameState?.state?.crowns || 0;

    useEffect(() => {
        // Request store items
        socket.emit('get_crown_store');

        const handleStoreUpdate = (items) => {
            setStoreItems(items);
            setLoading(false);
        };

        const handlePurchaseSuccess = (result) => {
            setPurchasing(null);
            setPurchaseResult({ success: true, message: result.message || 'Purchase successful!' });
            setTimeout(() => setPurchaseResult(null), 3000);
        };

        const handlePurchaseError = (result) => {
            setPurchasing(null);
            setPurchaseResult({ success: false, message: result.error || 'Purchase failed' });
            setTimeout(() => setPurchaseResult(null), 3000);
        };

        const handleStripeSession = (result) => {
            if (result.url) {
                setPurchaseResult({ success: true, message: 'Redirecting to Stripe...' });
                window.location.href = result.url;
            } else {
                setPurchasing(null);
                setPurchaseResult({ success: false, message: 'Failed to create payment session' });
            }
        };

        socket.on('crown_store_update', handleStoreUpdate);
        socket.on('crown_purchase_success', handlePurchaseSuccess);
        socket.on('crown_purchase_error', handlePurchaseError);
        socket.on('stripe_checkout_session', handleStripeSession);

        return () => {
            socket.off('crown_store_update', handleStoreUpdate);
            socket.off('crown_purchase_success', handlePurchaseSuccess);
            socket.off('crown_purchase_error', handlePurchaseError);
            socket.off('stripe_checkout_session', handleStripeSession);
        };
    }, [socket]);

    const handlePurchase = (item) => {
        if (item.category === 'PACKAGE') {
            setPurchasing(item.id);
            // Simulate payment gateway start
            socket.emit('buy_crown_package', { packageId: item.id });
        } else {
            setPurchasing(item.id);
            socket.emit('purchase_crown_item', { itemId: item.id });
        }
    };

    const getCategoryIcon = (category) => {
        switch (category) {
            case 'BOOST': return <Zap size={16} color="#ffd700" />;
            case 'CONVENIENCE': return <Package size={16} color="#4caf50" />;
            case 'COSMETIC': return <Sparkles size={16} color="#e040fb" />;
            case 'PACKAGE': return <Crown size={16} color="#ffd700" />;
            default: return <Star size={16} />;
        }
    };

    const getCategoryColor = (category) => {
        switch (category) {
            case 'BOOST': return '#ffd700';
            case 'CONVENIENCE': return '#4caf50';
            case 'COSMETIC': return '#e040fb';
            case 'PACKAGE': return '#ffd700';
            default: return '#888';
        }
    };

    // Group items by category
    const groupedItems = storeItems.reduce((acc, item) => {
        const cat = item.category || 'OTHER';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {});

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.9)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(10px)'
        }} onClick={onClose}>
            <div style={{
                background: 'linear-gradient(180deg, #1a1d26 0%, #0d0f14 100%)',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                borderRadius: '20px',
                padding: '0',
                width: '95%',
                maxWidth: '600px',
                maxHeight: '85vh',
                overflow: 'hidden',
                boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 40px rgba(212, 175, 55, 0.1)'
            }} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{
                    background: 'linear-gradient(90deg, rgba(212, 175, 55, 0.2), rgba(212, 175, 55, 0.05))',
                    padding: '20px 25px',
                    borderBottom: '1px solid rgba(212, 175, 55, 0.2)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Crown size={28} color="#ffd700" />
                        <div>
                            <h2 style={{ margin: 0, color: '#fff', fontSize: '1.3rem', fontWeight: '900' }}>CROWN SHOP</h2>
                            <div style={{ fontSize: '0.7rem', color: '#888', letterSpacing: '1px' }}>PREMIUM STORE</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{
                            background: 'rgba(255,215,0,0.1)',
                            border: '1px solid rgba(255,215,0,0.3)',
                            padding: '8px 16px',
                            borderRadius: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <Crown size={18} color="#ffd700" />
                            <span style={{ color: '#ffd700', fontWeight: '900', fontSize: '1.1rem' }}>{crowns}</span>
                        </div>
                        <button onClick={onClose} style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: 'none',
                            color: '#888',
                            cursor: 'pointer',
                            padding: '8px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center'
                        }}>
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Purchase Result Toast */}
                {purchaseResult && (
                    <div style={{
                        position: 'absolute',
                        top: '80px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: purchaseResult.success ? 'rgba(76, 175, 80, 0.9)' : 'rgba(244, 67, 54, 0.9)',
                        color: '#fff',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        zIndex: 10,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        {purchaseResult.success ? <Check size={18} /> : <X size={18} />}
                        {purchaseResult.message}
                    </div>
                )}

                {/* Content */}
                <div style={{
                    padding: '20px',
                    overflowY: 'auto',
                    maxHeight: 'calc(85vh - 100px)'
                }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', color: '#888', padding: '40px' }}>
                            Loading store...
                        </div>
                    ) : (
                        Object.entries(groupedItems).map(([category, items]) => (
                            <div key={category} style={{ marginBottom: '25px' }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    marginBottom: '12px',
                                    paddingBottom: '8px',
                                    borderBottom: `1px solid ${getCategoryColor(category)}33`
                                }}>
                                    {getCategoryIcon(category)}
                                    <span style={{
                                        color: getCategoryColor(category),
                                        fontSize: '0.75rem',
                                        fontWeight: '900',
                                        letterSpacing: '1px',
                                        textTransform: 'uppercase'
                                    }}>
                                        {category === 'BOOST' ? 'Boosts (24h)' :
                                            category === 'CONVENIENCE' ? 'Convenience' :
                                                category === 'COSMETIC' ? 'Cosmetics' :
                                                    category === 'PACKAGE' ? 'Crown Packages' : category}
                                    </span>
                                </div>

                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                                    gap: '12px'
                                }}>
                                    {items.map(item => {
                                        const isPackage = item.category === 'PACKAGE';
                                        const canAfford = isPackage ? true : (crowns >= item.cost);
                                        const isPurchasing = purchasing === item.id;

                                        return (
                                            <div key={item.id} style={{
                                                background: 'rgba(255,255,255,0.03)',
                                                border: `1px solid ${isPackage ? 'rgba(212, 175, 55, 0.4)' : (canAfford ? 'rgba(255,255,255,0.1)' : 'rgba(255,0,0,0.2)')}`,
                                                borderRadius: '12px',
                                                padding: '15px',
                                                opacity: canAfford ? 1 : 0.6,
                                                transition: '0.2s',
                                                position: 'relative',
                                                overflow: 'hidden'
                                            }}>
                                                {item.bestSeller && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: '10px',
                                                        right: '-30px',
                                                        background: '#ffd700',
                                                        color: '#000',
                                                        padding: '4px 35px',
                                                        fontSize: '0.6rem',
                                                        fontWeight: 'bold',
                                                        transform: 'rotate(45deg)',
                                                        boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
                                                        zIndex: 1
                                                    }}>BEST SELLER</div>
                                                )}
                                                {item.premium && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: '10px',
                                                        right: '-30px',
                                                        background: '#e040fb',
                                                        color: '#fff',
                                                        padding: '4px 35px',
                                                        fontSize: '0.6rem',
                                                        fontWeight: 'bold',
                                                        transform: 'rotate(45deg)',
                                                        boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
                                                        zIndex: 1
                                                    }}>BEST VALUE</div>
                                                )}

                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <span style={{ fontSize: '1.5rem' }}>{item.icon}</span>
                                                        <div>
                                                            <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.9rem' }}>{item.name}</div>
                                                            {item.permanent && (
                                                                <span style={{ fontSize: '0.6rem', color: '#4caf50', textTransform: 'uppercase' }}>Permanent</span>
                                                            )}
                                                            {item.duration && (
                                                                <span style={{ fontSize: '0.6rem', color: '#ffd700', textTransform: 'uppercase' }}>24 Hours</span>
                                                            )}
                                                            {isPackage && item.amount && (
                                                                <span style={{ fontSize: '0.65rem', color: '#ffd700', fontWeight: 'bold' }}>{item.amount} CROWNS</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        background: isPackage ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255,215,0,0.1)',
                                                        padding: '4px 10px',
                                                        borderRadius: '12px',
                                                        border: `1px solid ${isPackage ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255,215,0,0.2)'}`
                                                    }}>
                                                        {!isPackage && <Crown size={12} color="#ffd700" />}
                                                        <span style={{ color: isPackage ? '#4caf50' : '#ffd700', fontWeight: 'bold', fontSize: '0.85rem' }}>
                                                            {isPackage ? `R$ ${item.price.toFixed(2)}` : item.cost}
                                                        </span>
                                                    </div>
                                                </div>

                                                <p style={{ color: '#888', fontSize: '0.75rem', margin: '0 0 12px 0', lineHeight: '1.4' }}>
                                                    {item.description}
                                                </p>

                                                <button
                                                    onClick={() => canAfford && !isPurchasing && handlePurchase(item)}
                                                    disabled={!canAfford || isPurchasing}
                                                    style={{
                                                        width: '100%',
                                                        padding: '10px',
                                                        background: isPackage
                                                            ? 'linear-gradient(90deg, rgba(76, 175, 80, 0.4), rgba(76, 175, 80, 0.1))'
                                                            : (canAfford
                                                                ? 'linear-gradient(90deg, rgba(212, 175, 55, 0.3), rgba(212, 175, 55, 0.1))'
                                                                : 'rgba(100,100,100,0.2)'),
                                                        border: `1px solid ${isPackage ? 'rgba(76, 175, 80, 0.5)' : (canAfford ? 'rgba(212, 175, 55, 0.5)' : 'rgba(100,100,100,0.3)')}`,
                                                        borderRadius: '8px',
                                                        color: isPackage ? '#4caf50' : (canAfford ? '#ffd700' : '#666'),
                                                        fontWeight: 'bold',
                                                        fontSize: '0.8rem',
                                                        cursor: canAfford && !isPurchasing ? 'pointer' : 'not-allowed',
                                                        transition: '0.2s',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '6px'
                                                    }}
                                                >
                                                    {isPurchasing ? (
                                                        'Processing...'
                                                    ) : isPackage ? (
                                                        <>
                                                            <Crown size={14} />
                                                            BUY CROWNS
                                                        </>
                                                    ) : canAfford ? (
                                                        <>
                                                            <ShoppingBag size={14} />
                                                            PURCHASE
                                                        </>
                                                    ) : (
                                                        'Insufficient Crowns'
                                                    )}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default CrownShop;
