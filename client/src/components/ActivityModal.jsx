import React, { useState, useEffect } from 'react';
import { X, Clock, Zap, Target, Star, ChevronRight, Package, Box } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { resolveItem, formatItemId, QUALITIES } from '@shared/items';

const ActivityModal = ({ isOpen, onClose, item, type, gameState, onStart, onNavigate }) => {
    const [quantity, setQuantity] = useState(1);
    const [showProbabilities, setShowProbabilities] = useState(false);

    // Fallback se não houver item
    if (!item) return null;

    const charStats = gameState?.state?.stats || { str: 0, agi: 0, int: 0 };

    // Cálculos
    const qtyNum = Number(quantity) || 0;

    // Determine Efficiency Key based on Item Type/ID
    const getEfficiencyKey = (itemId, type) => {
        if (!itemId) return 'GLOBAL';
        if (type === 'GATHERING') {
            if (itemId.includes('WOOD')) return 'WOOD';
            if (itemId.includes('ORE')) return 'ORE';
            if (itemId.includes('HIDE')) return 'HIDE';
            if (itemId.includes('FIBER')) return 'FIBER';
            if (itemId.includes('FISH')) return 'FISH';
        } else if (type === 'REFINING') {
            if (itemId.includes('PLANK')) return 'PLANK';
            if (itemId.includes('BAR')) return 'METAL';
            if (itemId.includes('LEATHER')) return 'LEATHER';
            if (itemId.includes('CLOTH')) return 'CLOTH';
        } else if (type === 'CRAFTING') {
            if (itemId.includes('SWORD') || itemId.includes('PLATE') || itemId.includes('PICKAXE') || itemId.includes('SHIELD')) return 'WARRIOR';
            if (itemId.includes('BOW') || itemId.includes('LEATHER') || itemId.includes('AXE') || itemId.includes('TORCH')) return 'HUNTER';
            if (itemId.includes('STAFF') || itemId.includes('CLOTH') || itemId.includes('SICKLE') || itemId.includes('TOME')) return 'MAGE';
            if (itemId.includes('FOOD')) return 'COOKING';
            if (itemId.includes('CAPE')) return 'WARRIOR';
        }
        return 'GLOBAL';
    };

    const effKey = getEfficiencyKey(item.id, type);
    const efficiency = (gameState?.calculatedStats?.efficiency?.[effKey] || 0).toFixed(1);

    // XP
    const xpPerAction = item.xp || 5;
    const totalXP = (xpPerAction * qtyNum).toLocaleString();

    // Tempo base & Redução
    const baseTime = item.time || (type === 'GATHERING' ? 3.0 : (type === 'REFINING' ? 1.5 : (type === 'CRAFTING' ? 4.0 : 3.0)));
    // Efficiency reduces time: 10% eff = time * 0.9
    const reductionFactor = Math.max(0.1, 1 - (parseFloat(efficiency) / 100));
    const finalTime = Math.max(0.5, baseTime * reductionFactor);

    // Máximo 12h
    // Máximo 12h ou limitado por materiais
    const timeLimitMax = Math.floor(43200 / finalTime);
    let maxQuantity = timeLimitMax;

    if (type === 'CRAFTING' || type === 'REFINING') {
        const reqs = item.req || {};
        let maxByMaterials = Infinity;
        let hasReqs = false;

        Object.entries(reqs).forEach(([reqId, reqQty]) => {
            hasReqs = true;
            const userQty = (gameState?.state?.inventory?.[reqId] || 0);
            const possible = Math.floor(userQty / reqQty);
            if (possible < maxByMaterials) {
                maxByMaterials = possible;
            }
        });

        if (hasReqs && maxByMaterials !== Infinity) {
            maxQuantity = Math.min(timeLimitMax, maxByMaterials);
        }
    }
    const totalDuration = finalTime * qtyNum;

    const formatDuration = (seconds) => {
        if (!seconds) return '0s';
        if (seconds < 60) return `${seconds.toFixed(1).replace(/\.0$/, '')}s`;
        const m = Math.floor(seconds / 60);
        const s = (seconds % 60).toFixed(0);
        if (m < 60) return `${m}m ${s > 0 ? s + 's' : ''}`;
        const h = Math.floor(m / 60);
        const remM = m % 60;
        return `${h}h ${remM > 0 ? remM + 'm' : ''}`;
    };

    const handleMax = () => {
        setQuantity(maxQuantity);
    };

    const handleStart = () => {
        onStart(type, item.id, Number(quantity) || 1);
        onClose();
    };

    if (type === 'REFINING') {
        const reqs = item.req || {};
        const costPerAction = item.cost || 0; // Se houver custo em silver
        const totalCost = (costPerAction * qtyNum).toLocaleString();
        const userSilver = gameState?.state?.silver || 0;

        return (
            <AnimatePresence>
                {isOpen && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 2000,
                        padding: '20px',
                        background: 'rgba(0,0,0,0.85)',
                        backdropFilter: 'blur(4px)'
                    }} onClick={(e) => {
                        if (e.target === e.currentTarget) onClose();
                    }}>
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="modal-content"
                            style={{
                                width: '100%',
                                maxWidth: '400px',
                                padding: '2rem',
                                background: '#1a1f2e',
                                borderRadius: '16px',
                                boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                textAlign: 'center'
                            }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem', width: '100%', position: 'relative' }}>
                                {item.icon && <img src={item.icon} style={{ width: 64, height: 64, objectFit: 'contain', marginBottom: '10px', filter: 'drop-shadow(0 0 10px rgba(212,175,55,0.3))' }} alt={item.name} />}
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                                    <h3 style={{ color: '#d4af37', margin: '0px', fontSize: '1.4rem', fontWeight: '800', letterSpacing: '0.5px' }}>{item.name}</h3>
                                </div>
                                <button
                                    onClick={onClose}
                                    style={{ background: 'transparent', border: 'none', color: 'rgb(136, 136, 136)', cursor: 'pointer', padding: '4px', position: 'absolute', right: '-10px', top: '-10px' }}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div style={{ marginBottom: '1.25rem', width: '100%' }}>
                                <div style={{ fontSize: '0.7rem', color: 'rgb(136, 136, 136)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '1px', fontWeight: 'bold' }}>Quantity</div>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <input
                                        min="1"
                                        max={maxQuantity}
                                        type="number"
                                        value={quantity}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === '') {
                                                setQuantity('');
                                            } else {
                                                const num = parseInt(val);
                                                if (!isNaN(num)) {
                                                    setQuantity(Math.min(maxQuantity, Math.max(1, num)));
                                                }
                                            }
                                        }}
                                        style={{
                                            flex: '1 1 0%',
                                            padding: '6px 8px',
                                            fontSize: '0.85rem',
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            borderRadius: '4px',
                                            color: 'rgb(255, 255, 255)',
                                            outline: 'none'
                                        }}
                                    />
                                    <button
                                        onClick={handleMax}
                                        style={{
                                            padding: '6px 10px',
                                            background: 'rgba(212, 175, 55, 0.1)',
                                            border: '1px solid #d4af37',
                                            color: '#d4af37',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontSize: '0.7rem',
                                            fontWeight: 'bold',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        MAX ({formatDuration(maxQuantity * finalTime)})
                                    </button>
                                </div>
                                <div style={{ fontSize: '0.6rem', color: 'rgb(102, 102, 102)', marginTop: '3px' }}>Max: {maxQuantity.toLocaleString()}</div>
                            </div>

                            <div style={{ marginBottom: '1.25rem', width: '100%' }}>
                                <div style={{ fontSize: '0.7rem', color: 'rgb(136, 136, 136)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '1px', fontWeight: 'bold' }}>Required Materials</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                                    {Object.entries(reqs).map(([reqId, reqQty]) => {
                                        const userQty = (gameState?.state?.inventory?.[reqId] || 0);
                                        const totalReq = reqQty * qtyNum;
                                        const hasEnough = userQty >= totalReq;
                                        // Resolver nome
                                        const resolvedFn = resolveItem(reqId);
                                        const displayName = resolvedFn ? `T${resolvedFn.tier} ${resolvedFn.name}` : formatItemId(reqId);
                                        const isSingle = Object.keys(reqs).length === 1;

                                        return (
                                            <div onClick={() => onNavigate && onNavigate(reqId)} key={reqId} style={{
                                                flex: isSingle ? '1 1 100%' : '1 1 calc(50% - 6px)',
                                                minWidth: '140px',
                                                background: 'rgba(255, 255, 255, 0.03)',
                                                padding: '12px 15px',
                                                borderRadius: '8px',
                                                border: `1px solid ${hasEnough ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 68, 68, 0.3)'}`,
                                                cursor: 'pointer'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                    <div style={{ fontSize: '0.85rem', color: '#d4af37', fontWeight: '700' }}>{displayName}</div>
                                                    <Package size={14} color="#d4af37" />
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '0.75rem', color: 'rgb(136, 136, 136)' }}>Required: {totalReq}</span>
                                                    <span style={{ fontSize: '1rem', fontWeight: '900', color: hasEnough ? '#4caf50' : '#ff4444' }}>{userQty}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div style={{ marginBottom: '1.25rem', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)', width: '100%' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1rem' }}>
                                        <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: '700' }}>Efficiency</span>
                                        <span style={{ color: '#4caf50', fontWeight: '900', fontSize: '1.2rem' }}>+{efficiency}%</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                                        <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>Time per action</span>
                                        <span style={{ color: '#fff', fontWeight: '800' }}>{finalTime.toFixed(1)}s</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                                        <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>XP per action</span>
                                        <span style={{ color: '#d4af37', fontWeight: '800' }}>{xpPerAction}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                                        <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>Total Cost</span>
                                        <span style={{ color: '#d4af37', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <div style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid currentColor' }}></div>
                                            {totalCost}
                                        </span>
                                    </div>
                                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ color: '#fff', fontWeight: '900', fontSize: '0.85rem' }}>TOTAL XP</span>
                                        <span style={{ color: '#4caf50', fontWeight: '900', fontSize: '1rem' }}>{totalXP}</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleStart}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    background: '#d4af37',
                                    color: 'rgb(255, 255, 255)',
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    textTransform: 'uppercase'
                                }}
                            >
                                START ACTIVITY ({formatDuration(totalDuration)})
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        );
    }

    if (type === 'CRAFTING') {
        const reqs = item.req || {};
        const costPerAction = item.cost || 0;
        const totalCost = (costPerAction * qtyNum).toLocaleString();
        const userSilver = gameState?.state?.silver || 0;

        // Verificar se tem materiais suficientes para a quantidade atual
        let hasAllMaterials = true;
        Object.entries(reqs).forEach(([reqId, reqQty]) => {
            const userQty = (gameState?.state?.inventory?.[reqId] || 0);
            if (userQty < (reqQty * qtyNum)) hasAllMaterials = false;
        });

        // Toggle para accordion


        // Qualidades baseadas no QUALITIES real do shared/items.js
        const CRAFT_QUALITIES = Object.values(QUALITIES).map(q => ({
            name: q.name,
            chance: (q.chance * 100).toFixed(1) + '%',
            color: q.color,
            ipBonus: q.ipBonus
        }));

        // Determinar stat principal para mostrar (Damage, Armor ou Efficiency)
        const mainStatKey = item.stats?.damage ? 'Damage' : item.stats?.armor ? 'Armor' : item.stats?.efficiency ? 'Efficiency' : 'Power';

        let rawEff = item.stats?.efficiency;
        if (typeof rawEff === 'object') rawEff = rawEff.GLOBAL || 0;

        const mainStatVal = item.stats?.damage || item.stats?.armor || rawEff || 0;

        return (
            <AnimatePresence>
                {isOpen && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 2000,
                        padding: '20px',
                        background: 'rgba(0,0,0,0.85)',
                        backdropFilter: 'blur(4px)'
                    }} onClick={(e) => {
                        if (e.target === e.currentTarget) onClose();
                    }}>
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="modal-content"
                            style={{
                                width: '100%',
                                maxWidth: '400px',
                                padding: '2rem',
                                background: '#1a1f2e',
                                borderRadius: '16px',
                                boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                maxHeight: '90vh',
                                overflowY: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                textAlign: 'center'
                            }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem', width: '100%', position: 'relative' }}>
                                {item.icon && <img src={item.icon} style={{ width: 64, height: 64, objectFit: 'contain', marginBottom: '10px', filter: 'drop-shadow(0 0 10px rgba(212,175,55,0.3))' }} alt={item.name} />}
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                                    <h3 style={{ color: '#d4af37', margin: '0px', fontSize: '1.4rem', fontWeight: '800', letterSpacing: '0.5px' }}>{item.name}</h3>
                                </div>
                                <button
                                    onClick={onClose}
                                    style={{ background: 'transparent', border: 'none', color: 'rgb(136, 136, 136)', cursor: 'pointer', padding: '4px', position: 'absolute', right: '-10px', top: '-10px' }}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div style={{ marginBottom: '1.25rem', width: '100%' }}>
                                <div style={{ fontSize: '0.7rem', color: 'rgb(136, 136, 136)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '1px', fontWeight: 'bold' }}>Quantity</div>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <input
                                        min="1"
                                        max={maxQuantity}
                                        type="number"
                                        value={quantity}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === '') {
                                                setQuantity('');
                                            } else {
                                                const num = parseInt(val);
                                                if (!isNaN(num)) {
                                                    setQuantity(Math.min(maxQuantity, Math.max(1, num)));
                                                }
                                            }
                                        }}
                                        style={{
                                            flex: '1 1 0%',
                                            padding: '6px 8px',
                                            fontSize: '0.85rem',
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            borderRadius: '4px',
                                            color: 'rgb(255, 255, 255)',
                                            outline: 'none'
                                        }}
                                    />
                                    <button
                                        onClick={handleMax}
                                        style={{
                                            padding: '6px 10px',
                                            background: 'rgba(212, 175, 55, 0.1)',
                                            border: '1px solid #d4af37',
                                            color: '#d4af37',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontSize: '0.7rem',
                                            fontWeight: 'bold',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        MAX ({formatDuration(maxQuantity * finalTime)})
                                    </button>
                                </div>
                                <div style={{ fontSize: '0.6rem', color: 'rgb(102, 102, 102)', marginTop: '3px' }}>Max: {maxQuantity.toLocaleString()}</div>
                            </div>

                            <div style={{ marginBottom: '0.75rem', width: '100%' }}>
                                <div style={{ fontSize: '0.65rem', color: 'rgb(136, 136, 136)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>Required Materials</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {Object.entries(reqs).map(([reqId, reqQty]) => {
                                        const userQty = (gameState?.state?.inventory?.[reqId] || 0);
                                        const totalReq = reqQty * qtyNum;
                                        const hasEnough = userQty >= totalReq;
                                        // Resolver nome
                                        const resolvedFn = resolveItem(reqId);
                                        const displayName = resolvedFn ? `T${resolvedFn.tier} ${resolvedFn.name}` : formatItemId(reqId);

                                        return (
                                            <div onClick={() => onNavigate && onNavigate(reqId)} key={reqId} style={{ flex: '1 1 calc(50% - 3px)', minWidth: '120px', background: 'rgba(255, 255, 255, 0.03)', padding: '8px', borderRadius: '4px', border: `1px solid ${hasEnough ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 68, 68, 0.3)'}`, cursor: 'pointer', position: 'relative' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div style={{ fontSize: '0.7rem', color: '#d4af37', marginBottom: '2px', fontWeight: '600' }}>{displayName}</div>
                                                    <button title="Search in Market" style={{ background: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.3)', borderRadius: '4px', padding: '2px', cursor: 'pointer', color: '#d4af37', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <Package size={10} />
                                                    </button>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '0.6rem', color: 'rgb(136, 136, 136)' }}>x{totalReq}</span>
                                                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: hasEnough ? '#4caf50' : '#ff4444' }}>{userQty}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div style={{ marginBottom: '1.25rem', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)', width: '100%' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                                        <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>Efficiency</span>
                                        <span style={{ color: '#4caf50', fontWeight: '800' }}>+{efficiency}%</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                                        <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>Time per action</span>
                                        <span style={{ color: '#fff', fontWeight: '800' }}>{finalTime.toFixed(1)}s</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                                        <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>XP per action</span>
                                        <span style={{ color: '#d4af37', fontWeight: '800' }}>{xpPerAction}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                                        <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>Total Cost</span>
                                        <span style={{ color: '#d4af37', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <div style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid currentColor' }}></div>
                                            {totalCost}
                                        </span>
                                    </div>
                                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ color: '#fff', fontWeight: '900', fontSize: '0.85rem' }}>TOTAL XP</span>
                                        <span style={{ color: '#4caf50', fontWeight: '900', fontSize: '1rem' }}>{totalXP}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Probabilities Section */}
                            <div style={{ marginBottom: '0.75rem', width: '100%' }}>
                                <button
                                    onClick={() => setShowProbabilities(!showProbabilities)}
                                    style={{ width: '100%', background: 'rgba(212, 175, 55, 0.05)', padding: '8px 10px', borderRadius: '4px', border: '1px solid rgba(212, 175, 55, 0.2)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#d4af37', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Box size={14} />
                                        <span>Probabilities & Potential Results</span>
                                    </div>
                                    <ChevronRight size={16} style={{ transform: showProbabilities ? 'rotate(90deg)' : 'rotate(0deg)', transition: '0.2s' }} />
                                </button>

                                <AnimatePresence>
                                    {showProbabilities && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            style={{ overflow: 'hidden' }}
                                        >
                                            <div style={{ marginTop: '8px', background: 'rgba(0, 0, 0, 0.15)', padding: '4px', borderRadius: '6px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    {CRAFT_QUALITIES.map((q, idx) => (
                                                        <div key={idx} style={{ fontSize: '0.7rem', padding: '8px 10px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: `3px solid ${q.color}`, borderTop: '1px solid rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.03)', borderRight: '1px solid rgba(255,255,255,0.03)' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <span style={{ fontWeight: '600', color: q.color, letterSpacing: '0.5px', textTransform: 'uppercase', fontSize: '0.6rem' }}>{q.name}</span>
                                                                <span style={{ fontWeight: '700', color: '#fff', fontSize: '0.75rem' }}>{q.chance}</span>
                                                            </div>
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', opacity: 0.9, borderTop: '1px solid rgba(255, 255, 255, 0.04)', paddingTop: '6px' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#ff4d4d' }}>
                                                                    <Target size={11} />
                                                                    <span style={{ fontWeight: '600' }}>
                                                                        {(() => {
                                                                            const multiplier = 1 + (q.ipBonus / 100);
                                                                            let val = parseFloat((mainStatVal * multiplier).toFixed(1));
                                                                            // Prevent small floats from looking like ints if they are huge? No, fixed(1) is good.
                                                                            return `${val}${mainStatKey === 'Efficiency' ? '%' : ''} ${mainStatKey}`;
                                                                        })()}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <button
                                onClick={hasAllMaterials ? handleStart : null}
                                disabled={!hasAllMaterials}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    background: hasAllMaterials ? '#d4af37' : 'rgba(100, 100, 100, 0.3)',
                                    color: hasAllMaterials ? 'rgb(255, 255, 255)' : 'rgb(102, 102, 102)',
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontWeight: 'bold',
                                    cursor: hasAllMaterials ? 'pointer' : 'not-allowed',
                                    fontSize: '0.85rem',
                                    textTransform: 'uppercase'
                                }}
                            >
                                {hasAllMaterials ? `START ACTIVITY (${formatDuration(totalDuration)})` : 'INSUFFICIENT MATERIALS'}
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        );
    }

    if (type === 'GATHERING') {
        return (
            <AnimatePresence>
                {isOpen && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 2000,
                        padding: '20px',
                        background: 'rgba(0,0,0,0.85)',
                        backdropFilter: 'blur(4px)'
                    }} onClick={(e) => {
                        if (e.target === e.currentTarget) onClose();
                    }}>
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="modal-content"
                            style={{
                                width: '100%',
                                maxWidth: '400px',
                                padding: '2rem',
                                background: '#1a1f2e',
                                borderRadius: '16px',
                                boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                textAlign: 'center'
                            }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem', width: '100%', position: 'relative' }}>
                                {item.icon && <img src={item.icon} style={{ width: 64, height: 64, objectFit: 'contain', marginBottom: '10px', filter: 'drop-shadow(0 0 10px rgba(212,175,55,0.3))' }} alt={item.name} />}
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                                    <h3 style={{ color: '#d4af37', margin: '0px', fontSize: '1.4rem', fontWeight: '800', letterSpacing: '0.5px' }}>{item.name}</h3>
                                </div>
                                <button
                                    onClick={onClose}
                                    style={{ background: 'transparent', border: 'none', color: 'rgb(136, 136, 136)', cursor: 'pointer', padding: '4px', position: 'absolute', right: '-10px', top: '-10px' }}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div style={{ marginBottom: '1.25rem', width: '100%' }}>
                                <div style={{ fontSize: '0.7rem', color: 'rgb(136, 136, 136)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '1px', fontWeight: 'bold' }}>Quantity</div>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <input
                                        min="1"
                                        max={maxQuantity}
                                        type="number"
                                        value={quantity}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === '') {
                                                setQuantity('');
                                            } else {
                                                const num = parseInt(val);
                                                if (!isNaN(num)) {
                                                    setQuantity(Math.min(maxQuantity, Math.max(1, num)));
                                                }
                                            }
                                        }}
                                        style={{
                                            flex: '1 1 0%',
                                            padding: '6px 8px',
                                            fontSize: '0.85rem',
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            borderRadius: '4px',
                                            color: 'rgb(255, 255, 255)',
                                            outline: 'none'
                                        }}
                                    />
                                    <button
                                        onClick={handleMax}
                                        style={{
                                            padding: '6px 10px',
                                            background: 'rgba(212, 175, 55, 0.1)',
                                            border: '1px solid #d4af37',
                                            color: '#d4af37',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontSize: '0.7rem',
                                            fontWeight: 'bold',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        MAX ({formatDuration(maxQuantity * finalTime)})
                                    </button>
                                </div>
                                <div style={{ fontSize: '0.6rem', color: 'rgb(102, 102, 102)', marginTop: '3px' }}>Max: {maxQuantity.toLocaleString()}</div>
                            </div>

                            <div style={{ marginBottom: '1.25rem', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)', width: '100%' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1rem' }}>
                                        <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: '700' }}>Efficiency</span>
                                        <span style={{ color: '#d4af37', fontWeight: '900', fontSize: '1.2rem' }}>+{efficiency}%</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                                        <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>Time per action</span>
                                        <span style={{ color: '#fff', fontWeight: '800' }}>{finalTime.toFixed(1)}s <span style={{ fontSize: '0.6rem', color: '#666', textDecoration: 'line-through' }}>{baseTime}s</span></span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                                        <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>XP per action</span>
                                        <span style={{ color: '#d4af37', fontWeight: '800' }}>{xpPerAction}</span>
                                    </div>
                                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ color: '#fff', fontWeight: '900', fontSize: '0.85rem' }}>TOTAL XP</span>
                                        <span style={{ color: '#4caf50', fontWeight: '900', fontSize: '1rem' }}>{totalXP}</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleStart}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    background: '#d4af37',
                                    color: 'rgb(255, 255, 255)',
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    textTransform: 'uppercase'
                                }}
                            >
                                START ACTIVITY ({formatDuration(totalDuration)})
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        );
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2000,
                    padding: '20px'
                }}>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0,0,0,0.85)',
                            backdropFilter: 'blur(8px)'
                        }}
                    />

                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 10 }}
                        className="glass-panel"
                        style={{
                            width: '100%',
                            maxWidth: '420px',
                            background: 'rgba(15, 20, 30, 0.6)',
                            padding: '30px',
                            position: 'relative',
                            borderRadius: '24px',
                            border: '1px solid rgba(255,255,255,0.05)',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 0 30px rgba(0,0,0,0.2)'
                        }}
                    >
                        {/* Header Moderno */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
                            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                <div style={{
                                    width: '50px',
                                    height: '50px',
                                    background: 'rgba(212, 175, 55, 0.1)',
                                    borderRadius: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '1px solid rgba(212, 175, 55, 0.2)',
                                    color: '#d4af37'
                                }}>
                                    {item.icon ? (
                                        <img src={item.icon} style={{ width: '130%', height: '130%', objectFit: 'contain' }} alt="" />
                                    ) : (
                                        type === 'GATHERING' || type === 'REFINING' ? <Box size={24} /> : <Target size={24} />
                                    )}
                                </div>
                                <div>
                                    <h2 style={{ margin: 0, color: '#fff', fontSize: '1.4rem', fontWeight: '800', letterSpacing: '0.5px' }}>
                                        {item.name}
                                    </h2>
                                    <div style={{ fontSize: '0.75rem', color: '#888', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4caf50' }}></div>
                                        {type === 'GATHERING' ? 'GATHERING' : 'REFINING'} ACTIVITY
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: 'none',
                                    color: '#888',
                                    cursor: 'pointer',
                                    padding: '8px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    transition: '0.2s'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#888'; }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Quantity Card */}
                        <div style={{
                            background: 'rgba(0,0,0,0.2)',
                            borderRadius: '16px',
                            padding: '20px',
                            marginBottom: '20px',
                            border: '1px solid rgba(255,255,255,0.03)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <label style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '1px' }}>
                                    QUANTITY
                                </label>
                                <span style={{ fontSize: '0.7rem', color: '#555', fontWeight: 'bold' }}>MAX: {maxQuantity.toLocaleString()}</span>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <div style={{ position: 'relative', flex: 1 }}>
                                    <input
                                        type="number"
                                        min="1"
                                        max={maxQuantity}
                                        value={quantity}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value) || 1;
                                            setQuantity(Math.min(maxQuantity, Math.max(1, val)));
                                        }}
                                        style={{
                                            width: '100%',
                                            background: 'rgba(255,255,255,0.03)',
                                            border: '1px solid rgba(255,255,255,0.05)',
                                            borderRadius: '10px',
                                            padding: '12px 15px',
                                            color: '#fff',
                                            fontSize: '1.2rem',
                                            fontWeight: 'bold',
                                            outline: 'none',
                                            fontFamily: 'monospace'
                                        }}
                                    />
                                </div>
                                <button
                                    onClick={handleMax}
                                    style={{
                                        background: 'rgba(212, 175, 55, 0.1)',
                                        border: '1px solid rgba(212, 175, 55, 0.3)',
                                        color: '#d4af37',
                                        padding: '0 20px',
                                        height: '46px',
                                        borderRadius: '10px',
                                        fontSize: '0.8rem',
                                        fontWeight: '800',
                                        cursor: 'pointer',
                                        transition: '0.2s',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(212, 175, 55, 0.2)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(212, 175, 55, 0.1)'}
                                >
                                    MAX
                                </button>
                            </div>
                        </div>

                        {/* Stats Info */}
                        <div style={{ marginBottom: '1.25rem', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)', width: '100%' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                                    <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>EFFICIENCY</span>
                                    <span style={{ color: '#4caf50', fontWeight: '800' }}>+{efficiency}%</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                                    <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>TOTAL XP</span>
                                    <span style={{ color: '#d4af37', fontWeight: '800' }}>{totalXP}</span>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <button
                            onClick={handleStart}
                            style={{
                                width: '100%',
                                padding: '16px',
                                background: '#d4af37',
                                color: '#000',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: '0.9rem',
                                fontWeight: '800',
                                letterSpacing: '1px',
                                cursor: 'pointer',
                                transition: '0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                textTransform: 'uppercase',
                                boxShadow: '0 4px 15px rgba(212, 175, 55, 0.3)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 8px 25px rgba(212, 175, 55, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 15px rgba(212, 175, 55, 0.3)';
                            }}
                        >
                            <Target size={18} strokeWidth={3} />
                            INICIAR ({finalTime}s)
                        </button>

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ActivityModal;
