import React, { useState } from 'react';
import { Plus, User, LogOut } from 'lucide-react';

const CharacterSelect = ({ socket, user, gameState, onLogout, onSelect }) => {

    const [showNewChar, setShowNewChar] = useState(false);
    const [newName, setNewName] = useState('');
    const [error, setError] = useState('');

    const handleCreate = (e) => {
        e.preventDefault();
        if (!newName.trim()) return;
        socket.emit('create_character', { name: newName });
    };

    // O gameState null significa que ainda estamos carregando do servidor
    if (gameState === null) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0f', color: '#fff' }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="loading-spinner" style={{ marginBottom: '20px' }}>Carregando personagem...</div>
                    <div style={{ opacity: 0.5, fontSize: '0.8rem' }}>Conectando à Forged Lands...</div>
                </div>
            </div>
        );
    }

    // O gameState.noCharacter indica que o usuário não tem personagem
    const hasCharacter = gameState && !gameState.noCharacter;
    const charName = gameState?.name || 'Seu Personagem';

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at center, #2a2a2a 0%, #0d0d0d 100%)',
            fontFamily: 'system-ui, sans-serif',
            color: '#fff'
        }}>
            <div style={{
                width: '450px',
                padding: '2rem',
                background: 'rgba(20, 20, 20, 0.8)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                boxShadow: '0 0 40px rgba(0,0,0,0.6)',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h2 style={{ color: '#d4af37', margin: 0, fontSize: '1.2rem', letterSpacing: '1px' }}>MEU PERSONAGEM</h2>
                    <button
                        onClick={onLogout}
                        style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem' }}>
                        <LogOut size={14} /> SAIR
                    </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    {hasCharacter ? (
                        <div
                            style={{
                                cursor: 'pointer',
                                padding: '1.5rem',
                                textAlign: 'center',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid #d4af37',
                                borderRadius: '12px',
                                width: '200px',
                                transition: 'transform 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            onClick={() => onSelect()}

                        >
                            <User size={48} color="#d4af37" style={{ margin: '0 auto 15px' }} />
                            <div style={{ fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '5px' }}>{gameState.name || 'Aventureiro'}</div>
                            <div style={{ color: '#4caf50', fontSize: '0.8rem' }}>Ativo</div>
                        </div>
                    ) : (
                        <div
                            onClick={() => setShowNewChar(true)}
                            style={{
                                cursor: 'pointer',
                                padding: '1.5rem',
                                textAlign: 'center',
                                border: '2px dashed rgba(212, 175, 55, 0.3)',
                                borderRadius: '12px',
                                width: '200px',
                                opacity: 0.8,
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.opacity = '1';
                                e.currentTarget.style.borderColor = '#d4af37';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.opacity = '0.8';
                                e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.3)';
                            }}
                        >
                            <Plus size={48} color="#d4af37" style={{ margin: '0 auto 15px' }} />
                            <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>CRIAR PERSONAGEM</div>
                        </div>
                    )}
                </div>

                {showNewChar && (
                    <div style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.8)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 100
                    }} onClick={(e) => {
                        if (e.target === e.currentTarget) setShowNewChar(false);
                    }}>
                        <div style={{
                            background: '#1a1a1a',
                            padding: '1.5rem',
                            borderRadius: '12px',
                            border: '1px solid #d4af37',
                            width: '320px'
                        }}>
                            <h3 style={{ marginBottom: '1.5rem', textAlign: 'center', color: '#d4af37' }}>Novo Aventureiro</h3>
                            <form onSubmit={handleCreate}>
                                <input
                                    autoFocus
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        background: '#0a0e14',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        marginBottom: '1.5rem',
                                        outline: 'none'
                                    }}
                                    placeholder="Nome do Personagem"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    required
                                />
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowNewChar(false)}
                                        style={{
                                            flex: 1, padding: '10px', background: '#333', border: 'none',
                                            borderRadius: '6px', color: '#fff', cursor: 'pointer'
                                        }}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        style={{
                                            flex: 1, padding: '10px', background: '#d4af37', border: 'none',
                                            borderRadius: '6px', color: '#000', fontWeight: 'bold', cursor: 'pointer'
                                        }}
                                    >
                                        Criar
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>

            <div style={{
                position: 'absolute',
                bottom: '20px',
                color: 'rgba(255,255,255,0.1)',
                fontSize: '0.7rem'
            }}>
                FORGED LANDS v2.0.0 • SELEÇÃO DE PERSONAGEM
            </div>
        </div>
    );
};

export default CharacterSelect;
