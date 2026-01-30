import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

const Auth = ({ onLogin, initialView = 'LOGIN' }) => {
    const [isRegister, setIsRegister] = useState(false);
    const [view, setView] = useState(initialView); // 'LOGIN', 'REGISTER', 'FORGOT', 'RESET'
    const [isLoading, setIsLoading] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [activePlayers, setActivePlayers] = useState(0);

    useEffect(() => {
        const fetchActivePlayers = async () => {
            try {
                const apiUrl = import.meta.env.VITE_API_URL;
                const res = await fetch(`${apiUrl}/api/active_players`);
                if (res.ok) {
                    const data = await res.json();
                    setActivePlayers(data.count || 0);
                }
            } catch (err) {
                // Silently fallback if needed, but logging helps debug
                console.warn('Could not fetch active players count');
            }
        };

        fetchActivePlayers();
        const interval = setInterval(fetchActivePlayers, 15000); // 15s is enough
        return () => clearInterval(interval);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isLoading) return;
        setError('');
        setMessage('');
        setIsLoading(true);

        const email = username.trim().toLowerCase();
        const cleanPassword = password.trim();

        try {
            if (view === 'REGISTER') {
                const { data, error: regError } = await supabase.auth.signUp({
                    email,
                    password: cleanPassword,
                });
                if (regError) {
                    setError(regError.message);
                } else {
                    setView('LOGIN');
                    setMessage('Registration successful! Now please log in.');
                }
            } else if (view === 'LOGIN') {
                const { data, error: logError } = await supabase.auth.signInWithPassword({
                    email,
                    password: cleanPassword,
                });
                if (logError) {
                    setError(logError.message);
                } else {
                    onLogin(data.session);
                }
            } else if (view === 'FORGOT') {
                const { error: forgotError } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/`,
                });
                if (forgotError) {
                    setError(forgotError.message);
                } else {
                    setMessage('Check your email for the reset link!');
                }
            } else if (view === 'RESET') {
                if (newPassword !== confirmPassword) {
                    setError("Passwords don't match!");
                    setIsLoading(false);
                    return;
                }
                const { error: resetError } = await supabase.auth.updateUser({
                    password: newPassword,
                });
                if (resetError) {
                    setError(resetError.message);
                } else {
                    setMessage('Password updated! You can now log in.');
                    setView('LOGIN');
                }
            }
        } catch (err) {
            console.error('Auth error:', err);
            setError('An unexpected error occurred. Please try again.');
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
            color: '#fff',
            position: 'relative'
        }}>
            {/* Active Players at Top */}
            <div style={{
                position: 'absolute',
                top: '40px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                color: 'rgba(255,255,255,0.4)',
                fontSize: '0.8rem',
                textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                zIndex: 10
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(212, 175, 55, 0.1)',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    border: '1px solid rgba(212, 175, 55, 0.2)',
                    color: '#d4af37'
                }}>
                    <span style={{
                        width: '8px',
                        height: '8px',
                        background: '#44ff44',
                        borderRadius: '50%',
                        boxShadow: '0 0 10px #44ff44'
                    }}></span>
                    <span style={{ fontWeight: 'bold' }}>{activePlayers}</span>
                    <span style={{ fontSize: '0.7rem', letterSpacing: '1px' }}>ACTIVE PLAYERS</span>
                </div>
            </div>
            <div style={{
                width: '380px',
                padding: '1.5rem',
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
                <div style={{ marginBottom: '1.25rem', textAlign: 'center' }}>
                    <img
                        src="/logo.png"
                        alt="Forged Lands Logo"
                        style={{ width: '70px', height: 'auto', marginBottom: '0.25rem', filter: 'drop-shadow(0 0 10px rgba(212,175,55,0.3))' }}
                    />
                    <h1 style={{
                        color: 'var(--accent, #d4af37)',
                        margin: 0,
                        fontSize: '1.2rem',
                        fontWeight: '800',
                        textTransform: 'uppercase',
                        letterSpacing: '2px',
                        textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                    }}>
                        Forged Lands
                    </h1>
                    <div style={{ height: '2px', background: 'linear-gradient(90deg, transparent, var(--accent, #d4af37), transparent)', width: '100%', marginTop: '6px', opacity: 0.5 }}></div>
                </div>

                <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                    {view !== 'RESET' && (
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{
                                display: 'block',
                                fontSize: '0.7rem',
                                color: '#aaa',
                                fontWeight: '600',
                                marginBottom: '0.4rem',
                                letterSpacing: '1px'
                            }}>
                                EMAIL ADDRESS
                            </label>
                            <input
                                type="text"
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
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
                                placeholder="email@example.com"
                            />
                        </div>
                    )}

                    {view !== 'FORGOT' && view !== 'RESET' && (
                        <div style={{ marginBottom: view === 'LOGIN' ? '0.5rem' : '2rem' }}>
                            <label style={{
                                display: 'block',
                                fontSize: '0.7rem',
                                color: '#aaa',
                                fontWeight: '600',
                                marginBottom: '0.4rem',
                                letterSpacing: '1px'
                            }}>
                                PASSWORD
                            </label>
                            <input
                                type="password"
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
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
                    )}

                    {view === 'LOGIN' && (
                        <div style={{ textAlign: 'right', marginBottom: '0.75rem' }}>
                            <span
                                onClick={() => { setView('FORGOT'); setError(''); setMessage(''); }}
                                style={{ color: '#888', fontSize: '0.65rem', cursor: 'pointer', textDecoration: 'underline' }}
                            >
                                Forgot Password?
                            </span>
                        </div>
                    )}

                    {view === 'RESET' && (
                        <>
                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: '#aaa', fontWeight: '600', marginBottom: '0.5rem', letterSpacing: '1px' }}>
                                    NEW PASSWORD
                                </label>
                                <input
                                    type="password"
                                    style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '1rem', outline: 'none' }}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    placeholder="••••••"
                                />
                            </div>
                            <div style={{ marginBottom: '2rem' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: '#aaa', fontWeight: '600', marginBottom: '0.5rem', letterSpacing: '1px' }}>
                                    CONFIRM NEW PASSWORD
                                </label>
                                <input
                                    type="password"
                                    style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '1rem', outline: 'none' }}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    placeholder="••••••"
                                />
                            </div>
                        </>
                    )}

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

                    {message && (
                        <div style={{
                            background: 'rgba(68, 255, 68, 0.1)',
                            border: '1px solid rgba(68, 255, 68, 0.3)',
                            color: '#44ff44',
                            padding: '10px',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            marginBottom: '1.5rem',
                            textAlign: 'center'
                        }}>
                            {message}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                            width: '100%',
                            padding: '10px',
                            marginBottom: '0.5rem',
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
                            ? (view === 'REGISTER' ? 'CREATING ACCOUNT...' : view === 'FORGOT' ? 'SENDING...' : view === 'RESET' ? 'UPDATING...' : 'STARTING JOURNEY...')
                            : (view === 'REGISTER' ? 'CREATE ACCOUNT' : view === 'FORGOT' ? 'SEND RESET LINK' : view === 'RESET' ? 'UPDATE PASSWORD' : 'START JOURNEY')}
                    </button>

                    {/* Google Login Button */}
                    {view === 'LOGIN' && (
                        <button
                            type="button"
                            onClick={async () => {
                                setIsLoading(true);
                                const { error } = await supabase.auth.signInWithOAuth({
                                    provider: 'google',
                                    options: {
                                        redirectTo: window.location.origin
                                    }
                                });
                                if (error) setError(error.message);
                                setIsLoading(false);
                            }}
                            disabled={isLoading}
                            style={{
                                width: '100%',
                                padding: '10px',
                                marginBottom: '1rem',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                color: '#fff',
                                fontWeight: '600',
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                transition: '0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        >
                            <svg width="18" height="18" viewBox="0 0 18 18">
                                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.248h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
                                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.248c-.806.54-1.836.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" />
                                <path fill="#FBBC05" d="M3.964 10.719c-.18-.54-.282-1.117-.282-1.719s.102-1.179.282-1.719V4.949H.957C.347 6.169 0 7.548 0 9s.347 2.831.957 4.051l3.007-2.332z" />
                                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.949L3.964 7.28c.708-2.127 2.692-3.711 5.036-3.711z" />
                            </svg>
                            CONTINUE WITH GOOGLE
                        </button>
                    )}

                    {view !== 'LOGIN' && (
                        <div
                            onClick={() => {
                                if (isLoading) return;
                                setView('LOGIN');
                                setError('');
                                setMessage('');
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
                            <span>
                                {view === 'FORGOT' ? 'Remembered?' : view === 'RESET' ? 'Back to' : ''}
                            </span>
                            <span style={{ color: '#d4af37', fontWeight: 'bold' }}>
                                Login
                            </span>
                        </div>
                    )}
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
