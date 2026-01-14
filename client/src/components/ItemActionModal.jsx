import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Coins, Tag, Trash2, ArrowRight } from 'lucide-react';
import { getTierColor } from '../data/items';

const ItemActionModal = ({ item, onClose, onEquip, onSell, onList }) => {
    if (!item) return null;

    const tierColor = getTierColor(item.tier);
    const borderColor = item.rarityColor || tierColor;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)',
                    zIndex: 100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(4px)'
                }}
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        background: '#1a1a1a',
                        border: `1px solid ${borderColor}`,
                        borderRadius: '16px',
                        padding: '24px',
                        width: '90%',
                        maxWidth: '350px',
                        boxShadow: `0 0 30px ${borderColor}33`,
                        position: 'relative'
                    }}
                >
                    <button
                        onClick={onClose}
                        style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            background: 'none',
                            border: 'none',
                            color: '#888',
                            cursor: 'pointer'
                        }}
                    >
                        <X size={20} />
                    </button>

                    {/* Header */}
                    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                        <div style={{
                            fontSize: '1.2rem',
                            fontWeight: 'bold',
                            color: item.rarityColor || '#fff',
                            marginBottom: '4px'
                        }}>
                            {item.name}
                        </div>
                        <div style={{
                            fontSize: '0.8rem',
                            color: tierColor,
                            fontWeight: 'bold',
                            border: `1px solid ${tierColor}`,
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '4px'
                        }}>
                            TIER {item.tier}
                        </div>
                    </div>

                    {/* Stats/Desc would go here if available */}

                    {/* Actions */}
                    <div style={{ display: 'grid', gap: '10px' }}>
                        {item.canEquip && (
                            <button
                                onClick={() => { onEquip(item.id); onClose(); }}
                                style={{
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: 'var(--accent)',
                                    color: '#000',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    cursor: 'pointer'
                                }}
                            >
                                <Shield size={18} /> EQUIP
                            </button>
                        )}

                        <button
                            onClick={() => { onList(item.id, item); onClose(); }}
                            style={{
                                padding: '12px',
                                borderRadius: '8px',
                                border: '1px solid var(--accent)',
                                background: 'transparent',
                                color: 'var(--accent)',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                cursor: 'pointer'
                            }}
                        >
                            <Tag size={18} /> LIST ON MARKET
                        </button>

                        <button
                            onClick={() => { onSell(item.id); onClose(); }}
                            style={{
                                padding: '12px',
                                borderRadius: '8px',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                background: 'rgba(255, 255, 255, 0.05)',
                                color: '#ccc',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                cursor: 'pointer'
                            }}
                        >
                            <Coins size={18} /> SELL QUICKLY ({item.value || 0})
                        </button>
                    </div>

                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ItemActionModal;
