import React, { useState, useEffect } from 'react';
import { Trophy, Sword, Skull, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const LeaderboardModal = ({ isOpen, onClose, socket, isMobile }) => {
    const [activeTab, setActiveTab] = useState('COMBAT'); // COMBAT | DUNGEON
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        setLoading(true);
        socket.emit('get_leaderboard', activeTab);

        const handleUpdate = ({ type, data }) => {
            if (type === activeTab) {
                setData(data);
                setLoading(false);
            }
        };

        socket.on('leaderboard_update', handleUpdate);

        return () => {
            socket.off('leaderboard_update', handleUpdate);
        };
    }, [isOpen, activeTab, socket]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'rgba(0,0,0,0.8)',
                backdropFilter: 'blur(5px)',
                zIndex: 2000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px'
            }}>
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    style={{
                        background: '#1a1a2e',
                        border: '1px solid #d4af37',
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: '500px',
                        maxHeight: '80vh',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        boxShadow: '0 0 50px rgba(212, 175, 55, 0.2)'
                    }}
                >
                    {/* Header */}
                    <div style={{
                        padding: '15px 20px',
                        borderBottom: '1px solid rgba(255,255,255,0.1)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'rgba(0,0,0,0.2)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Trophy color="#d4af37" size={24} />
                            <h2 style={{ margin: 0, color: '#d4af37', fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Leaderboard</h2>
                        </div>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff' }}>
                            <X size={24} />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <button
                            onClick={() => setActiveTab('COMBAT')}
                            style={{
                                flex: 1,
                                padding: '15px',
                                background: activeTab === 'COMBAT' ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
                                border: 'none',
                                color: activeTab === 'COMBAT' ? '#d4af37' : '#888',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                transition: '0.2s',
                                borderBottom: activeTab === 'COMBAT' ? '2px solid #d4af37' : 'none'
                            }}
                        >
                            <Sword size={18} />
                            TOP KILLERS
                        </button>
                        <button
                            onClick={() => setActiveTab('DUNGEON')}
                            style={{
                                flex: 1,
                                padding: '15px',
                                background: activeTab === 'DUNGEON' ? 'rgba(174, 0, 255, 0.1)' : 'transparent',
                                border: 'none',
                                color: activeTab === 'DUNGEON' ? '#ae00ff' : '#888',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                transition: '0.2s',
                                borderBottom: activeTab === 'DUNGEON' ? '2px solid #ae00ff' : 'none'
                            }}
                        >
                            <Skull size={18} />
                            DUNGEON MASTERS
                        </button>
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '10px', background: '#131323' }}>
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Loading rankings...</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {data.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>No records yet. Be the first!</div>
                                ) : (
                                    data.map((char, index) => {
                                        const isTop3 = index < 3;
                                        const score = activeTab === 'COMBAT'
                                            ? (char.state?.stats?.totalKills || 0)
                                            : (char.state?.stats?.dungeonsCleared || 0);

                                        return (
                                            <div key={char.id} style={{
                                                background: isTop3 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
                                                borderRadius: '8px',
                                                padding: '12px 15px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                border: isTop3 ? `1px solid ${activeTab === 'COMBAT' ? '#d4af37' : '#ae00ff'}` : '1px solid transparent'
                                            }}>
                                                <div style={{
                                                    width: '30px',
                                                    fontWeight: '900',
                                                    color: index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : '#666',
                                                    fontSize: '1.2rem'
                                                }}>
                                                    {index + 1}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 'bold', color: '#fff' }}>{char.name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#888' }}>Level {char.state?.skills?.COMBAT?.level || 1}</div>
                                                </div>
                                                <div style={{
                                                    fontSize: '1.2rem',
                                                    fontWeight: 'bold',
                                                    color: activeTab === 'COMBAT' ? '#ff4444' : '#ae00ff',
                                                    fontFamily: 'monospace'
                                                }}>
                                                    {score.toLocaleString()}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default LeaderboardModal;
