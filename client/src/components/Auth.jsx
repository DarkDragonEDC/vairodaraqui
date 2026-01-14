import React, { useState } from 'react';
import { supabase } from '../supabase';

const Auth = ({ onLogin }) => {
    const [isRegister, setIsRegister] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isLoading) return;
        setError('');
        setIsLoading(true);

        const formatEmail = (val) => {
            const trimmed = val.trim();
            return trimmed.includes('@') ? trimmed : `${trimmed}@game.com`;
        };
        const email = formatEmail(username);
        const cleanPassword = password.trim();

        try {
            if (isRegister) {
                const { data, error: regError } = await supabase.auth.signUp({
                    email,
                    password: cleanPassword,
                });
                if (regError) {
                    setError(regError.message);
                } else {
                    setIsRegister(false);
                    setError('Cadastro realizado! Agora faça login.');
                }
            } else {
                const { data, error: logError } = await supabase.auth.signInWithPassword({
                    email,
                    password: cleanPassword,
                });
                if (logError) {
                    setError(logError.message);
                } else {
                    onLogin(data.session);
                }
            }
        } catch (err) {
            console.error('Auth error:', err);
            setError('Ocorreu um erro inesperado. Tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

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
                width: '380px',
                padding: '2rem',
                background: 'rgba(20, 20, 20, 0.8)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                boxShadow: '0 0 40px rgba(0,0,0,0.6)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
            }}>
                {/* Logo and Title */}
                <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                    <img
                        src="/logo.png"
                        alt="Forged Lands Logo"
                        style={{ width: '120px', height: 'auto', marginBottom: '1rem', filter: 'drop-shadow(0 0 10px rgba(212,175,55,0.3))' }}
                    />
                    <h1 style={{
                        color: 'var(--accent, #d4af37)',
                        margin: 0,
                        fontSize: '2rem',
                        fontWeight: '800',
                        textTransform: 'uppercase',
                        letterSpacing: '2px',
                        textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                    }}>
                        Forged Lands
                    </h1>
                    <div style={{ height: '2px', background: 'linear-gradient(90deg, transparent, var(--accent, #d4af37), transparent)', width: '100%', marginTop: '10px', opacity: 0.5 }}></div>
                </div>

                <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{
                            display: 'block',
                            fontSize: '0.75rem',
                            color: '#aaa',
                            fontWeight: '600',
                            marginBottom: '0.5rem',
                            letterSpacing: '1px'
                        }}>
                            NICKNAME / EMAIL
                        </label>
                        <input
                            type="text"
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: 'rgba(0,0,0,0.4)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '1rem',
                                outline: 'none',
                                transition: 'border-color 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#d4af37'}
                            onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                            disabled={isLoading}
                            value={username}
                            onChange={(e) => setUsername(e.target.value.trim().toLowerCase())}
                            required
                            placeholder="Seu Nickname"
                        />
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                        <label style={{
                            display: 'block',
                            fontSize: '0.75rem',
                            color: '#aaa',
                            fontWeight: '600',
                            marginBottom: '0.5rem',
                            letterSpacing: '1px'
                        }}>
                            SENHA
                        </label>
                        <input
                            type="password"
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: 'rgba(0,0,0,0.4)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '1rem',
                                outline: 'none',
                                transition: 'border-color 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#d4af37'}
                            onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                            disabled={isLoading}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="••••••"
                        />
                    </div>

                    {error && (
                        <div style={{
                            background: 'rgba(255, 68, 68, 0.1)',
                            border: '1px solid rgba(255, 68, 68, 0.3)',
                            color: '#ff4444',
                            padding: '10px',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            marginBottom: '1.5rem',
                            textAlign: 'center'
                        }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                            width: '100%',
                            padding: '14px',
                            marginBottom: '1.5rem',
                            background: isLoading
                                ? 'rgba(212, 175, 55, 0.5)'
                                : 'linear-gradient(135deg, #d4af37 0%, #b8860b 100%)',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#000',
                            fontWeight: 'bold',
                            fontSize: '1rem',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            boxShadow: '0 4px 15px rgba(212, 175, 55, 0.3)',
                            transition: 'all 0.1s',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            opacity: isLoading ? 0.7 : 1
                        }}
                    >
                        {isLoading
                            ? (isRegister ? 'CRIANDO CONTA...' : 'INICIANDO JORNADA...')
                            : (isRegister ? 'CRIAR CONTA' : 'INICIAR JORNADA')}
                    </button>

                    <div
                        onClick={() => {
                            if (isLoading) return;
                            setIsRegister(!isRegister);
                            setError('');
                        }}
                        style={{
                            color: '#888',
                            fontSize: '0.9rem',
                            textAlign: 'center',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '5px'
                        }}
                    >
                        <span>{isRegister ? 'Já é um aventureiro?' : 'Novo por aqui?'}</span>
                        <span style={{ color: '#d4af37', fontWeight: 'bold' }}>
                            {isRegister ? 'Login' : 'Criar Conta'}
                        </span>
                    </div>
                </form>
            </div>

            <div style={{
                position: 'absolute',
                bottom: '20px',
                color: 'rgba(255,255,255,0.1)',
                fontSize: '0.7rem'
            }}>
                FORGED LANDS v2.0.0 • SERVER-SIDE RPG
            </div>
        </div>
    );
};

export default Auth;
