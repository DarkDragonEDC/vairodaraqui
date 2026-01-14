import React from 'react';
import { Package, Star, Clock, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const OfflineGainsModal = ({ isOpen, data, onClose }) => {
    if (!isOpen || !data) return null;

    const { totalTime, itemsGained, xpGained } = data;

    // Format seconds to HH:mm:ss
    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.8)',
                    backdropFilter: 'blur(5px)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}
            >
                <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    style={{
                        background: 'linear-gradient(135deg, rgba(20, 25, 35, 0.95) 0%, rgba(10, 15, 20, 0.98) 100%)',
                        border: '1px solid rgba(212, 175, 55, 0.2)',
                        borderRadius: '20px',
                        width: '100%',
                        maxWidth: '500px',
                        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(212, 175, 55, 0.1)',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                >
                    {/* Header */}
                    <div style={{
                        padding: '25px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        textAlign: 'center',
                        background: 'linear-gradient(to right, rgba(212, 175, 55, 0.05), transparent, rgba(212, 175, 55, 0.05))'
                    }}>
                        <h2 style={{
                            margin: 0,
                            fontSize: '1.8rem',
                            fontWeight: '900',
                            color: '#d4af37',
                            letterSpacing: '1px',
                            textTransform: 'uppercase',
                            textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                        }}>
                            Progresso Offline
                        </h2>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            marginTop: '10px',
                            color: '#888',
                            fontSize: '0.9rem'
                        }}>
                            <Clock size={16} color="#d4af37" />
                            <span>Você esteve fora por <strong style={{ color: '#eee' }}>{formatTime(totalTime || 0)}</strong></span>
                        </div>
                    </div>

                    {/* Body */}
                    <div style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '25px', maxHeight: '60vh', overflowY: 'auto' }}>

                        {/* XP Section */}
                        {xpGained && Object.keys(xpGained).length > 0 && (
                            <div>
                                <h3 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: '#aaa', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Star size={16} color="#4caf50" /> Experiência Coletada
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {Object.entries(xpGained).map(([skill, amount]) => (
                                        <div key={skill} style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            background: 'rgba(76, 175, 80, 0.1)',
                                            padding: '12px 15px',
                                            borderRadius: '8px',
                                            border: '1px solid rgba(76, 175, 80, 0.2)'
                                        }}>
                                            <span style={{ fontWeight: 'bold', color: '#eee' }}>{skill}</span>
                                            <span style={{ color: '#4caf50', fontWeight: '900' }}>+{amount.toLocaleString()} XP</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Items Section */}
                        {itemsGained && Object.keys(itemsGained).length > 0 ? (
                            <div>
                                <h3 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: '#aaa', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Package size={16} color="#d4af37" /> Itens Coletados
                                </h3>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))',
                                    gap: '10px'
                                }}>
                                    {Object.entries(itemsGained).map(([itemId, amount]) => (
                                        <div key={itemId} style={{
                                            background: 'rgba(0, 0, 0, 0.3)',
                                            border: '1px solid rgba(255, 255, 255, 0.05)',
                                            borderRadius: '10px',
                                            padding: '10px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '5px',
                                            position: 'relative'
                                        }}>
                                            <div style={{
                                                width: '40px',
                                                height: '40px',
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                borderRadius: '8px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <Package size={20} color="var(--accent)" style={{ opacity: 0.8 }} />
                                            </div>
                                            <div style={{
                                                position: 'absolute',
                                                top: '-5px',
                                                right: '-5px',
                                                background: 'var(--accent)',
                                                color: '#000',
                                                fontSize: '0.7rem',
                                                fontWeight: 'bold',
                                                padding: '2px 6px',
                                                borderRadius: '10px',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
                                            }}>
                                                x{amount}
                                            </div>
                                            <span style={{ fontSize: '0.7rem', color: '#ccc', textAlign: 'center', width: '100%', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                                {itemId.split('_')[1] || itemId}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            (!xpGained || Object.keys(xpGained).length === 0) && (
                                <div style={{ textAlign: 'center', color: '#888', padding: '20px', fontStyle: 'italic' }}>
                                    Nenhum progresso realizado durante este período.
                                </div>
                            )
                        )}

                    </div>

                    {/* Footer */}
                    <div style={{ padding: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <button
                            onClick={onClose}
                            style={{
                                width: '100%',
                                background: 'linear-gradient(135deg, #d4af37 0%, #8a6d0a 100%)',
                                border: 'none',
                                padding: '15px',
                                borderRadius: '10px',
                                color: '#000',
                                fontWeight: '900',
                                fontSize: '1rem',
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(212, 175, 55, 0.3)',
                                textTransform: 'uppercase',
                                letterSpacing: '1px'
                            }}
                        >
                            Confirmar
                        </button>
                    </div>

                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default OfflineGainsModal;
