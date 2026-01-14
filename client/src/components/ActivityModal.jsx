import React, { useState, useEffect } from 'react';
import { X, Clock, Zap, Target, Star, ChevronRight, Package, Box } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ActivityModal = ({ isOpen, onClose, item, type, gameState, onStart, onNavigate }) => {
    const [quantity, setQuantity] = useState(1);
    const [showProbabilities, setShowProbabilities] = useState(false);

    // Fallback se não houver item
    if (!item) return null;

    const charStats = gameState?.state?.stats || { str: 0, agi: 0, int: 0 };

    // Cálculos
    const qtyNum = Number(quantity) || 0;
    const efficiency = (charStats.int * 3.5).toFixed(1); // 3.5% por ponto de INT (Exemplo)
    const xpPerAction = item.xp || 5;
    const totalXP = (xpPerAction * qtyNum).toLocaleString();

    // Tempo base
    const baseTime = type === 'GATHERING' ? 3 : 1.5;
    const finalTime = baseTime; // Sem redução por AGI

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
                                maxWidth: '380px',
                                padding: '1rem',
                                background: '#1a1f2e',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                border: '1px solid rgba(255,255,255,0.1)'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ color: '#d4af37', margin: '0px', fontSize: '1.1rem', fontWeight: 'bold' }}>{item.name}</h3>
                                <button
                                    onClick={onClose}
                                    style={{ background: 'transparent', border: 'none', color: 'rgb(136, 136, 136)', cursor: 'pointer', padding: '4px' }}
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div style={{ marginBottom: '0.75rem' }}>
                                <div style={{ fontSize: '0.65rem', color: 'rgb(136, 136, 136)', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>Quantity</div>
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

                            <div style={{ marginBottom: '0.75rem' }}>
                                <div style={{ fontSize: '0.65rem', color: 'rgb(136, 136, 136)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>Required Materials</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {Object.entries(reqs).map(([reqId, reqQty]) => {
                                        const userQty = (gameState?.state?.inventory?.[reqId] || 0);
                                        const hasEnough = userQty >= (reqQty * qtyNum);
                                        return (
                                            <div onClick={() => onNavigate && onNavigate(reqId)} key={reqId} style={{ flex: '1 1 calc(50% - 3px)', minWidth: '120px', background: 'rgba(255, 255, 255, 0.03)', padding: '8px', borderRadius: '4px', border: `1px solid ${hasEnough ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 68, 68, 0.3)'}`, cursor: 'pointer', position: 'relative' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div style={{ fontSize: '0.7rem', color: '#d4af37', marginBottom: '2px', fontWeight: '600' }}>{reqId}</div>
                                                    <button title="Search in Market" style={{ background: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.3)', borderRadius: '4px', padding: '2px', cursor: 'pointer', color: '#d4af37', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <Package size={10} />
                                                    </button>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '0.6rem', color: 'rgb(136, 136, 136)' }}>x{reqQty * qtyNum}</span>
                                                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: hasEnough ? '#4caf50' : '#ff4444' }}>{userQty}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div style={{ marginBottom: '0.75rem', background: 'rgba(0, 0, 0, 0.2)', padding: '8px', borderRadius: '4px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '4px' }}>
                                    <span style={{ color: 'rgb(136, 136, 136)' }}>Efficiency</span>
                                    <span style={{ color: '#4caf50' }}>+{efficiency}%</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '4px' }}>
                                    <span style={{ color: 'rgb(136, 136, 136)' }}>XP per action</span>
                                    <span style={{ color: '#d4af37' }}>{xpPerAction}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '4px' }}>
                                    <span style={{ color: 'rgb(136, 136, 136)' }}>Total Cost <span style={{ fontSize: '0.6rem', color: 'rgb(102, 102, 102)' }}>(Have: {userSilver.toLocaleString()})</span></span>
                                    <span style={{ color: '#d4af37', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                        {/* Simple Circle Icon for Coin */}
                                        <div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid currentColor' }}></div>
                                        {totalCost}
                                    </span>
                                </div>
                                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '6px', marginTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                                    <span style={{ fontWeight: 'bold', color: 'rgb(255, 255, 255)' }}>TOTAL XP</span>
                                    <span style={{ color: '#4caf50', fontWeight: 'bold' }}>{totalXP}</span>
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


        // Qualidades Hardcoded para visualização (baseado no snippet)
        const CRAFT_QUALITIES = [
            { name: 'Normal', chance: '53.6%', color: '#888', bonuxMultiplier: 1.0 },
            { name: 'Good', chance: '27.6%', color: '#4caf50', bonuxMultiplier: 1.1 },
            { name: 'Outstanding', chance: '11.9%', color: '#4a90e2', bonuxMultiplier: 1.2 },
            { name: 'Excellent', chance: '5.3%', color: '#9013fe', bonuxMultiplier: 1.3 },
            { name: 'Masterpiece', chance: '1.6%', color: '#f5a623', bonuxMultiplier: 1.4 },
        ];

        // Determinar stat principal para mostrar (Damage ou Armor)
        const mainStatKey = item.stats?.damage ? 'Damage' : item.stats?.armor ? 'Armor' : 'Power';
        const mainStatVal = item.stats?.damage || item.stats?.armor || 0;

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
                                maxWidth: '380px',
                                padding: '1rem',
                                background: '#1a1f2e',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                maxHeight: '90vh',
                                overflowY: 'auto'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ color: '#d4af37', margin: '0px', fontSize: '1.1rem', fontWeight: 'bold' }}>{item.name}</h3>
                                <button
                                    onClick={onClose}
                                    style={{ background: 'transparent', border: 'none', color: 'rgb(136, 136, 136)', cursor: 'pointer', padding: '4px' }}
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div style={{ marginBottom: '0.75rem' }}>
                                <div style={{ fontSize: '0.65rem', color: 'rgb(136, 136, 136)', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>Quantity</div>
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

                            <div style={{ marginBottom: '0.75rem' }}>
                                <div style={{ fontSize: '0.65rem', color: 'rgb(136, 136, 136)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>Required Materials</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {Object.entries(reqs).map(([reqId, reqQty]) => {
                                        const userQty = (gameState?.state?.inventory?.[reqId] || 0);
                                        const totalReq = reqQty * qtyNum;
                                        const hasEnough = userQty >= totalReq;
                                        return (
                                            <div onClick={() => onNavigate && onNavigate(reqId)} key={reqId} style={{ flex: '1 1 calc(50% - 3px)', minWidth: '120px', background: 'rgba(255, 255, 255, 0.03)', padding: '8px', borderRadius: '4px', border: `1px solid ${hasEnough ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 68, 68, 0.3)'}`, cursor: 'pointer', position: 'relative' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div style={{ fontSize: '0.7rem', color: '#d4af37', marginBottom: '2px', fontWeight: '600' }}>{reqId}</div>
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

                            <div style={{ marginBottom: '0.75rem', background: 'rgba(0, 0, 0, 0.2)', padding: '8px', borderRadius: '4px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '4px' }}>
                                    <span style={{ color: 'rgb(136, 136, 136)' }}>Accuracy</span>
                                    <span style={{ color: '#4caf50' }}>+{efficiency}%</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '4px' }}>
                                    <span style={{ color: 'rgb(136, 136, 136)' }}>XP per action</span>
                                    <span style={{ color: '#d4af37' }}>{xpPerAction}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '4px' }}>
                                    <span style={{ color: 'rgb(136, 136, 136)' }}>Total Cost <span style={{ fontSize: '0.6rem', color: 'rgb(102, 102, 102)' }}>(Have: {userSilver.toLocaleString()})</span></span>
                                    <span style={{ color: '#d4af37', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                        <div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid currentColor' }}></div>
                                        {totalCost}
                                    </span>
                                </div>
                                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '6px', marginTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                                    <span style={{ fontWeight: 'bold', color: 'rgb(255, 255, 255)' }}>TOTAL XP</span>
                                    <span style={{ color: '#4caf50', fontWeight: 'bold' }}>{totalXP}</span>
                                </div>
                            </div>

                            {/* Probabilities Section */}
                            <div style={{ marginBottom: '0.75rem' }}>
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
                                                                    <span style={{ fontWeight: '600' }}>{Math.floor(mainStatVal * q.bonuxMultiplier)} {mainStatKey}</span>
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
                                maxWidth: '380px',
                                padding: '1rem',
                                background: '#1a1f2e', // Dark background implied
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                border: '1px solid rgba(255,255,255,0.1)'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ color: '#d4af37', margin: '0px', fontSize: '1.1rem', fontWeight: 'bold' }}>{item.name}</h3>
                                <button
                                    onClick={onClose}
                                    style={{ background: 'transparent', border: 'none', color: 'rgb(136, 136, 136)', cursor: 'pointer', padding: '4px' }}
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div style={{ marginBottom: '0.75rem' }}>
                                <div style={{ fontSize: '0.65rem', color: 'rgb(136, 136, 136)', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>Quantity</div>
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
                                        MAX (11h 59m)
                                    </button>
                                </div>
                                <div style={{ fontSize: '0.6rem', color: 'rgb(102, 102, 102)', marginTop: '3px' }}>Max: {maxQuantity.toLocaleString()}</div>
                            </div>

                            <div style={{ marginBottom: '0.75rem', background: 'rgba(0, 0, 0, 0.2)', padding: '8px', borderRadius: '4px' }}>

                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '4px' }}>
                                    <span style={{ color: 'rgb(136, 136, 136)' }}>Efficiency</span>
                                    <span style={{ color: '#d4af37' }}>+{efficiency}%</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '4px' }}>
                                    <span style={{ color: 'rgb(136, 136, 136)' }}>XP per action</span>
                                    <span style={{ color: '#d4af37' }}>{xpPerAction}</span>
                                </div>
                                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '6px', marginTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                                    <span style={{ fontWeight: 'bold', color: 'rgb(255, 255, 255)' }}>TOTAL XP</span>
                                    <span style={{ color: '#4caf50', fontWeight: 'bold' }}>{totalXP}</span>
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
                                    {type === 'GATHERING' || type === 'REFINING' ? <Box size={24} /> : <Target size={24} />}
                                </div>
                                <div>
                                    <h2 style={{ margin: 0, color: '#fff', fontSize: '1.4rem', fontWeight: '800', letterSpacing: '0.5px' }}>
                                        {item.name}
                                    </h2>
                                    <div style={{ fontSize: '0.75rem', color: '#888', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4caf50' }}></div>
                                        ATIVIDADE DE {type === 'GATHERING' ? 'COLETA' : 'REFINO'}
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
                                    QUANTIDADE
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
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '15px',
                            marginBottom: '25px'
                        }}>
                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '12px', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.65rem', color: '#888', textTransform: 'uppercase', fontWeight: 'bold' }}>EFFICIENCY</div>
                                <div style={{ fontSize: '1.1rem', color: '#4caf50', fontWeight: '800', marginTop: '4px' }}>+{efficiency}%</div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '12px', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.65rem', color: '#888', textTransform: 'uppercase', fontWeight: 'bold' }}>TOTAL XP</div>
                                <div style={{ fontSize: '1.1rem', color: '#d4af37', fontWeight: '800', marginTop: '4px' }}>{totalXP}</div>
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
