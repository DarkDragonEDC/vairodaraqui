import React, { useState, useEffect } from 'react';
import { Package, X } from 'lucide-react';
import { resolveItem, getTierColor, formatItemId } from '@shared/items';

const MarketListingModal = ({ listingItem, onClose, socket }) => {
    const [amount, setAmount] = useState('1');
    const [unitPrice, setUnitPrice] = useState('');

    useEffect(() => {
        if (listingItem) {
            setAmount('1');
            setUnitPrice('');
        }
    }, [listingItem]);

    if (!listingItem) return null;

    const itemData = resolveItem(listingItem.itemId);
    const tierColor = getTierColor(itemData?.tier || 1);

    const handleConfirm = () => {
        if (!unitPrice || !amount) return;

        const total = Math.floor(parseInt(amount) * parseInt(unitPrice));

        socket.emit('list_market_item', {
            itemId: listingItem.itemId,
            amount: parseInt(amount),
            price: total
        });

        onClose();
    };

    const parsedAmount = parseInt(amount) || 0;
    const parsedUnitPrice = parseInt(unitPrice) || 0;
    const totalPrice = parsedAmount * parsedUnitPrice;
    const fee = Math.floor(totalPrice * 0.05);
    const receive = totalPrice - fee;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(5px)'
        }} onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
        }}>
            <div style={{
                background: '#1a1a1a',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                width: '90%',
                maxWidth: '400px',
                padding: '25px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: '0px', color: '#fff', fontSize: '1.2rem' }}>List Item on Market</h3>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', color: 'rgb(136, 136, 136)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Item Info */}
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', background: 'rgba(255, 255, 255, 0.03)', padding: '15px', borderRadius: '12px' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        background: 'rgba(0, 0, 0, 0.4)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: `1px solid ${tierColor}`
                    }}>
                        <span style={{ color: tierColor, fontWeight: 'bold' }}>T{itemData?.tier}</span>
                    </div>
                    <div>
                        <div style={{ fontWeight: 'bold', color: '#fff' }}>{itemData?.name || formatItemId(listingItem.itemId)}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Owned: {listingItem.max}</div>
                    </div>
                </div>

                {/* Inputs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {/* Amount Input */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Amount to sell:</label>
                            <button
                                onClick={() => setAmount(String(listingItem.max))}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    border: 'none',
                                    color: 'var(--accent)',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontSize: '0.7rem',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                MAX
                            </button>
                        </div>
                        <input
                            min="1"
                            max={listingItem.max}
                            type="number"
                            value={amount}
                            onChange={(e) => {
                                const val = Math.min(listingItem.max, parseInt(e.target.value) || 0);
                                setAmount(String(val || ''));
                            }}
                            style={{
                                width: '100%',
                                background: 'rgba(0, 0, 0, 0.3)',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                padding: '10px',
                                color: 'rgb(255, 255, 255)',
                                outline: 'none',
                                fontWeight: 'bold',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    {/* Unit Price Input */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '8px' }}>Price per Unit (Silver):</label>
                        <input
                            min="1"
                            type="number"
                            value={unitPrice}
                            onChange={(e) => setUnitPrice(e.target.value)}
                            placeholder="0"
                            style={{
                                width: '100%',
                                background: 'rgba(0, 0, 0, 0.3)',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                padding: '10px',
                                color: 'rgb(255, 255, 255)',
                                outline: 'none',
                                fontWeight: 'bold',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    {/* Calculation Box */}
                    <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '12px', borderRadius: '8px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-dim)' }}>Total Price:</span>
                            <span style={{ color: '#fff', fontWeight: 'bold' }}>{totalPrice.toLocaleString()} Silver</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-dim)' }}>Market Tax (5%):</span>
                            <span style={{ color: 'rgb(255, 68, 68)' }}>
                                - {fee.toLocaleString()}
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '6px' }}>
                            <span style={{ color: '#fff' }}>You receive:</span>
                            <span style={{ color: 'rgb(68, 255, 68)' }}>
                                {receive.toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Confirm Button */}
                <button
                    onClick={handleConfirm}
                    style={{
                        width: '100%',
                        padding: '15px',
                        borderRadius: '12px',
                        border: 'none',
                        background: 'var(--accent)',
                        color: 'rgb(0, 0, 0)',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        marginTop: '10px',
                        fontSize: '1rem'
                    }}
                >
                    Confirm Listing
                </button>
            </div>
        </div>
    );
};

export default MarketListingModal;
