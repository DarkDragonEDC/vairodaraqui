import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import '../index.css';

import { formatNumber, formatSilver } from '@utils/format';

const CharacterSelection = ({ onSelectCharacter }) => {
    const [characters, setCharacters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [newCharName, setNewCharName] = useState('');
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchCharacters();
    }, []);

    const fetchCharacters = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const apiUrl = import.meta.env.VITE_API_URL;
            const res = await fetch(`${apiUrl}/api/characters`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to fetch characters');
            }

            const data = await res.json();
            setCharacters(data);
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newCharName.trim()) return;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const apiUrl = import.meta.env.VITE_API_URL;
            const res = await fetch(`${apiUrl}/api/characters`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: newCharName })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to create character');
            }

            const newChar = await res.json();
            setCharacters([...characters, newChar]);
            setCreating(false);
            setNewCharName('');
            setError(null);
        } catch (err) {
            setError(err.message);
        }
    };

    const getEquipmentIcons = (char) => {
        if (!char || !char.state || !char.state.equipment) return null;
        const equip = char.state.equipment;
        // Simple visual indicators of progression
        const icons = [];
        if (equip.mainHand) icons.push('⚔️');
        if (equip.chest) icons.push('🛡️');
        if (equip.tool_pickaxe || equip.tool_axe) icons.push('⛏️');
        return icons.join(' ');
    };

    if (loading) return <div className="loading-screen">Loading Characters...</div>;

    return (
        <div className="char-select-container">
            <h1>Select Your Character</h1>

            {error && <div className="error-message">{error}</div>}

            <div className="char-list">
                {characters.map(char => (
                    <div key={char.id} className="char-card" onClick={() => onSelectCharacter(char.id)}>
                        <h3 className="char-name">{char.name}</h3>
                        <div className="char-info">
                            <p>Total Level: {char.state && char.state.skills ? formatNumber(Object.values(char.state.skills).reduce((acc, s) => acc + (s.level || 0), 0)) : 0}</p>
                            <p>Silver: {char.state ? formatNumber(char.state.silver || 0) : 0}</p>
                            <p className="char-icons">{getEquipmentIcons(char)}</p>
                        </div>
                        <button className="play-btn">Play</button>
                    </div>
                ))}

                {characters.length < 2 && !creating && (
                    <div className="char-card new-char" onClick={() => setCreating(true)}>
                        <div className="plus-icon">+</div>
                        <p>New Character</p>
                    </div>
                )}

                {creating && (
                    <div className="char-card create-form">
                        <input
                            type="text"
                            placeholder="Character Name"
                            value={newCharName}
                            onChange={(e) => setNewCharName(e.target.value)}
                            maxLength={12}
                        />
                        <div className="create-actions">
                            <button onClick={handleCreate}>Create</button>
                            <button className="cancel" onClick={() => setCreating(false)}>Cancel</button>
                        </div>
                    </div>
                )}
            </div>
            <style>{`
                .char-select-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    background: #1a1a1a;
                    color: #fff;
                    font-family: 'Press Start 2P', cursive;
                }
                .char-list {
                    display: flex;
                    gap: 20px;
                    margin-top: 40px;
                    flex-wrap: wrap;
                    justify-content: center;
                }
                .char-card {
                    background: #2a2a2a;
                    border: 2px solid #444;
                    padding: 20px;
                    width: 200px;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: transform 0.2s, border-color 0.2s;
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                }
                .char-card:hover {
                    transform: translateY(-5px);
                    border-color: #ffd700;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.5);
                }
                .char-name {
                    color: #ffd700;
                    margin-bottom: 10px;
                    font-size: 1.1em;
                }
                .char-info p {
                    font-size: 0.8em;
                    color: #ccc;
                    margin: 5px 0;
                }
                .char-icons {
                    font-size: 1.2em;
                    margin-top: 5px;
                }
                .play-btn {
                    margin-top: 15px;
                    background: #4CAF50;
                    color: white;
                    border: none;
                    padding: 8px;
                    cursor: pointer;
                    font-family: inherit;
                }
                .play-btn:hover { background: #45a049; }
                
                .new-char {
                    border-style: dashed;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    color: #888;
                }
                .plus-icon {
                    font-size: 3em;
                    margin-bottom: 10px;
                }

                .create-form input {
                    width: 90%;
                    padding: 8px;
                    margin-bottom: 10px;
                    background: #111;
                    border: 1px solid #555;
                    color: white;
                    font-family: inherit;
                }
                .create-actions {
                    display: flex;
                    gap: 5px;
                    justify-content: center;
                }
                .create-actions button {
                    padding: 5px 10px;
                    cursor: pointer;
                    font-family: inherit;
                    border: none;
                }
                .create-actions button.cancel {
                    background: #d32f2f;
                    color: white;
                }
                .error-message {
                    color: #ff6b6b;
                    margin-bottom: 20px;
                }
            `}</style>
        </div>
    );
};

export default CharacterSelection;
