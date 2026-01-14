import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { supabase } from './supabase';
import Auth from './components/Auth';
import CharacterSelect from './components/CharacterSelect';
import ChatWidget from './components/ChatWidget';
import Sidebar from './components/Sidebar';
import InventoryPanel from './components/InventoryPanel';
import ActivityWidget from './components/ActivityWidget';
import ProfilePanel from './components/ProfilePanel';
import ItemInfoModal from './components/ItemInfoModal';
import MarketPanel from './components/MarketPanel';
import ActivityModal from './components/ActivityModal';
import RankingPanel from './components/RankingPanel';

import CombatPanel from './components/CombatPanel';
import OfflineGainsModal from './components/OfflineGainsModal';
import MarketListingModal from './components/MarketListingModal';
import {
  Zap, Package, User, Trophy, Coins,
  Axe, Pickaxe, Target, Shield, Sword,
  Star, Layers, Box, Castle, Lock, Menu, X, Tag, Clock, Heart
} from 'lucide-react';
import { ITEMS } from './data/items';
import { motion, AnimatePresence } from 'framer-motion';
import { useOptimisticState } from './hooks/useOptimisticState';

const calculateNextLevelXP = (level) => {
  return Math.floor(100 * Math.pow(1.15, level - 1));
};

const mapTabCategoryToSkill = (tab, category) => {
  const maps = {
    gathering: {
      WOOD: 'LUMBERJACK',
      ORE: 'ORE_MINER',
      HIDE: 'ANIMAL_SKINNER',
      FIBER: 'FIBER_HARVESTER',
      FISH: 'FISHING'
    },
    refining: {
      PLANK: 'PLANK_REFINER',
      BAR: 'METAL_BAR_REFINER',
      LEATHER: 'LEATHER_REFINER',
      CLOTH: 'CLOTH_REFINER'
    },
    crafting: {
      WARRIORS_FORGE: 'WARRIOR_CRAFTER',
      HUNTERS_LODGE: 'HUNTER_CRAFTER',
      MAGES_TOWER: 'MAGE_CRAFTER',
      COOKING_STATION: 'COOKING'
    },
    combat: {
      COMBAT: 'COMBAT'
    }
  };
  return maps[tab.toLowerCase()]?.[category.toUpperCase()];
};

function App() {
  const [session, setSession] = useState(null);
  const [socket, setSocket] = useState(null);
  const [gameState, setGameState] = useState(null);
  const clockOffset = useRef(0);
  const displayedGameState = useOptimisticState(gameState);
  const [error, setError] = useState('');
  const [characterSelected, setCharacterSelected] = useState(false);

  // Navigation State
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('activeTab') || 'inventory');
  const [activeCategory, setActiveCategory] = useState(() => localStorage.getItem('activeCategory') || 'WOOD');
  const [activeTier, setActiveTier] = useState(() => parseInt(localStorage.getItem('activeTier')) || 1);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modalItem, setModalItem] = useState(null);
  const [infoItem, setInfoItem] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [offlineReport, setOfflineReport] = useState(null);
  const [marketSellItem, setMarketSellItem] = useState(null);

  const handleListOnMarket = (item) => {
    setMarketSellItem(item);
  };

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Persistir navegação
  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
    localStorage.setItem('activeCategory', activeCategory);
    localStorage.setItem('activeTier', activeTier);
  }, [activeTab, activeCategory, activeTier]);

  // Monitor Offline Report from GameState
  useEffect(() => {
    if (gameState?.offlineReport) {
      console.log("OFFLINE REPORT RECEIVED:", gameState.offlineReport);
      setOfflineReport(gameState.offlineReport);
    }
  }, [gameState]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
        auth: { token: session.access_token },
        transports: ['websocket', 'polling']
      });

      setSocket(newSocket);

      newSocket.on('connect', () => {
        console.log('Connected to server');
        newSocket.emit('get_status');
      });

      newSocket.on('status_update', (status) => {
        console.log('[REALTIME] Status update received:', status);
        if (status.serverTime) {
          clockOffset.current = status.serverTime - Date.now();
        }
        setGameState(status);
        if (status.name) setCharacterSelected(true);
      });

      newSocket.on('action_result', (result) => {
        console.log('Action result:', result);
        // Aqui podemos disparar uma notificação ou animação personalizada no futuro
      });

      newSocket.on('skill_level_up', ({ message }) => {
        // Log ou sistema de toast silencioso pode ser adicionado futuramente
      });

      newSocket.on('error', (msg) => {
        setError(typeof msg === 'string' ? msg : msg.message);
      });

      // Heartbeat: Sincronização forçada a cada 15 segundos para evitar o "F5"
      const heartbeat = setInterval(() => {
        if (newSocket.connected) {
          newSocket.emit('get_status');
        }
      }, 15000);

      return () => {
        clearInterval(heartbeat);
        newSocket.close();
      };
    }
  }, [session]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setGameState(null);
    setCharacterSelected(false);
  };

  const handleEquip = (itemId) => {
    socket.emit('equip_item', { itemId });
  };

  const startActivity = (type, itemId, quantity = 1) => {
    socket.emit('start_activity', { actionType: type, itemId, quantity });
  };

  const claimReward = () => {
    socket.emit('claim_reward');
  };

  // --- Helpers de Bloqueio ---
  const getSkillKey = (type, itemId) => {
    if (type === 'GATHERING') {
      if (itemId.includes('WOOD')) return 'LUMBERJACK';
      if (itemId.includes('ORE')) return 'ORE_MINER';
      if (itemId.includes('HIDE')) return 'ANIMAL_SKINNER';
      if (itemId.includes('FIBER')) return 'FIBER_HARVESTER';
      if (itemId.includes('FISH')) return 'FISHING';
    }
    if (type === 'REFINING') {
      if (itemId.includes('PLANK')) return 'PLANK_REFINER';
      if (itemId.includes('BAR')) return 'METAL_BAR_REFINER';
      if (itemId.includes('LEATHER')) return 'LEATHER_REFINER';
      if (itemId.includes('CLOTH')) return 'CLOTH_REFINER';
    }
    if (type === 'CRAFTING') {
      if (itemId.includes('SWORD') || itemId.includes('PLATE') || itemId.includes('PICKAXE') || itemId.includes('SHIELD')) return 'WARRIOR_CRAFTER';
      if (itemId.includes('BOW') || itemId.includes('LEATHER') || itemId.includes('AXE') || itemId.includes('TORCH')) return 'HUNTER_CRAFTER';
      if (itemId.includes('STAFF') || itemId.includes('CLOTH') || itemId.includes('SICKLE') || itemId.includes('TOME')) return 'MAGE_CRAFTER';
      if (itemId.includes('FOOD')) return 'COOKING';
      if (itemId.includes('CAPE')) return 'WARRIOR_CRAFTER';
    }
    return null;
  };

  const getLevelRequirement = (tier) => tier === 1 ? 1 : (tier - 1) * 10;

  const isLocked = (type, item) => {
    if (!displayedGameState?.state) return false;
    const skillKey = getSkillKey(type, item.id);
    const userLevel = displayedGameState.state.skills[skillKey]?.level || 1;
    const requiredLevel = getLevelRequirement(item.tier);
    return userLevel < requiredLevel;
  };

  const SkillProgressHeader = ({ tab, category }) => {
    if (!displayedGameState?.state?.skills) return null;

    const skillKey = mapTabCategoryToSkill(tab, category);
    const skill = displayedGameState.state.skills[skillKey];

    if (!skill) return null;

    const nextXP = calculateNextLevelXP(skill.level);
    const progress = Math.min(100, (skill.xp / nextXP) * 100);
    const remainingXP = nextXP - skill.xp;

    return (
      <div className="glass-panel" style={{
        padding: '12px 20px',
        marginBottom: '15px',
        background: 'rgba(212, 175, 55, 0.03)',
        border: '1px solid rgba(212, 175, 55, 0.08)',
        borderRadius: '10px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: '900', color: '#fff', letterSpacing: '1px', textTransform: 'uppercase' }}>
              {category}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: '900', color: '#fff' }}>
              Lv {skill.level} <span style={{ fontSize: '0.65rem', color: '#888', fontWeight: 'normal' }}>({Math.floor(progress)}%)</span>
            </div>
            <div style={{ fontSize: '0.55rem', color: '#555', fontWeight: 'bold' }}>
              {skill.xp.toLocaleString()} / {nextXP.toLocaleString()} XP
            </div>
            <div style={{ fontSize: '0.55rem', color: '#ff4444', fontWeight: 'bold', marginTop: '1px' }}>
              -{remainingXP.toLocaleString()} left
            </div>
          </div>
        </div>
        <div style={{ height: '3px', background: 'rgba(0,0,0,0.3)', borderRadius: '2px', overflow: 'hidden', marginTop: '10px' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            style={{ height: '100%', background: '#d4af37', boxShadow: '0 0 8px rgba(212, 175, 55, 0.3)' }}
          />
        </div>
      </div>
    );
  };

  const renderTierFilter = () => {
    const tiersList = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
        gap: '10px',
        marginBottom: '20px',
        background: 'rgba(0,0,0,0.15)',
        padding: '15px',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.02)'
      }}>
        {tiersList.map(t => (
          <button
            key={t}
            onClick={() => setActiveTier(t)}
            style={{
              background: activeTier === t ? 'var(--accent-soft)' : 'rgba(255,255,255,0.02)',
              border: '1px solid',
              borderColor: activeTier === t ? 'var(--border-active)' : 'rgba(255,255,255,0.03)',
              color: activeTier === t ? '#d4af37' : '#555',
              padding: '12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '900',
              transition: '0.2s',
              fontSize: '0.7rem',
              textAlign: 'center',
              letterSpacing: '1px'
            }}
          >
            TIER {t}
          </button>
        ))}
      </div>
    );
  };

  const renderActionButton = (type, item, extraStyles = {}) => {
    const locked = isLocked(type, item);
    const req = getLevelRequirement(item.tier);

    const label = type === 'GATHERING' ? 'GATHER'
      : type === 'REFINING' ? 'REFINE'
        : type === 'CRAFTING' ? 'CRAFT'
          : 'ACTION';

    return (
      <button
        key={item.id}
        onClick={() => {
          if (!locked) {
            setModalItem(item);
            setModalType(type);
          }
        }}
        disabled={locked}
        style={{
          ...actionBtnStyle,
          ...extraStyles,
          opacity: locked ? 0.5 : 1,
          cursor: locked ? 'not-allowed' : 'pointer',
          borderRadius: '8px',
          padding: '8px 20px',
          background: locked ? 'rgba(255,255,255,0.05)' : 'rgba(76, 175, 80, 0.1)', // Greenish for action
          border: '1px solid',
          borderColor: locked ? 'rgba(255,255,255,0.1)' : 'rgba(76, 175, 80, 0.3)',
          color: locked ? '#888' : '#4caf50',
          fontWeight: '900',
          fontSize: '0.75rem',
          letterSpacing: '1px',
          height: 'fit-content'
        }}
      >
        {locked ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Lock size={12} />
            LV {req}
          </div>
        ) : (
          label
        )}
      </button>
    );
  };

  if (!session) return <Auth onLogin={setSession} />;
  if (gameState?.noCharacter || !characterSelected) {
    return (
      <CharacterSelect
        socket={socket}
        gameState={gameState}
        onLogout={handleLogout}
        onSelect={() => setCharacterSelected(true)}
      />
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfilePanel gameState={displayedGameState} session={session} socket={socket} onShowInfo={setInfoItem} isMobile={isMobile} />;
      case 'market':
        return <MarketPanel socket={socket} gameState={displayedGameState} silver={displayedGameState.state?.silver || 0} onShowInfo={setInfoItem} onListOnMarket={handleListOnMarket} isMobile={isMobile} />;
      case 'gathering':
      case 'refining': {
        const isGathering = activeTab === 'gathering';
        const activeCategoryData = isGathering ? ITEMS.RAW[activeCategory] : ITEMS.REFINED[activeCategory];
        const itemsToRender = Object.values(activeCategoryData || {}).filter(item => item.tier === activeTier);

        return (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <SkillProgressHeader tab={activeTab} category={activeCategory} />
            <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: '16px', background: 'rgba(15, 20, 30, 0.4)' }}>
              <div style={{ padding: isMobile ? '20px' : '30px 40px', borderBottom: '1px solid var(--border)' }}>
                <h2 style={{ margin: 0, color: '#fff', fontSize: '1.2rem', fontWeight: '900', letterSpacing: '2px' }}>{activeCategory} {isGathering ? 'GATHERING' : 'REFINING'}</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', marginTop: '15px' }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(t => (
                    <button key={t} onClick={() => setActiveTier(t)} style={{ padding: '6px', background: activeTier === t ? 'var(--accent-soft)' : 'rgba(255,255,255,0.02)', border: '1px solid', borderColor: activeTier === t ? 'var(--border-active)' : 'rgba(255,255,255,0.05)', borderRadius: '4px', color: activeTier === t ? '#d4af37' : '#555', fontSize: '0.65rem', fontWeight: '900' }}>T{t}</button>
                  ))}
                </div>
              </div>
              <div className="scroll-container" style={{ padding: isMobile ? '20px' : '30px 40px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {itemsToRender.map(item => {
                    const locked = isLocked(isGathering ? 'GATHERING' : 'REFINING', item);
                    const reqLevel = getLevelRequirement(item.tier);
                    const reqs = item.req || {}; // For refining

                    const isActive = displayedGameState?.current_activity?.item_id === item.id;
                    const duration = (isGathering ? 3.0 : 1.5) * 1000;

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          if (!locked) {
                            setModalItem(item);
                            setModalType(isGathering ? 'GATHERING' : 'REFINING');
                          }
                        }}
                        disabled={locked}
                        className="resource-card"
                        style={{
                          borderLeft: isActive ? '4px solid var(--accent)' : 'none',
                          display: 'flex',
                          gap: '12px',
                          alignItems: 'center',
                          padding: '12px',
                          opacity: locked ? 0.5 : 1,
                          cursor: locked ? 'not-allowed' : 'pointer',
                          filter: 'none',
                          background: isActive ? 'rgba(212, 175, 55, 0.05)' : 'rgba(0,0,0,0.2)',
                          width: '100%',
                          textAlign: 'left',
                          border: isActive ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.05)',
                          borderRadius: '8px',
                          marginBottom: '10px',
                          transition: 'all 0.2s ease',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                        onMouseEnter={(e) => { if (!locked && !isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                        onMouseLeave={(e) => { if (!locked && !isActive) e.currentTarget.style.background = 'rgba(0,0,0,0.2)'; }}
                      >
                        {/* Icon Container */}
                        <div style={{
                          width: '48px',
                          height: '48px',
                          background: 'rgba(255, 255, 255, 0.03)',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          flexShrink: 0
                        }}>
                          {isGathering ? (
                            <Pickaxe size={24} style={{ opacity: 0.7 }} color={locked ? '#555' : 'var(--accent)'} />
                          ) : (
                            <Box size={24} style={{ opacity: 0.7 }} color={locked ? '#555' : 'var(--accent)'} />
                          )}
                        </div>

                        {/* Content */}
                        <div style={{ flex: '1 1 0%' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px', color: locked ? '#888' : (isActive ? 'var(--accent)' : '#eee') }}>
                              {item.name}
                              {locked && <Lock size={14} color="#ff4444" />}
                              {isActive && <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 2 }} style={{ fontSize: '0.6rem', background: 'var(--accent)', color: '#000', padding: '1px 4px', borderRadius: '3px', fontWeight: '900' }}>ATIVO</motion.span>}
                            </span>
                          </div>

                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {/* Tier Badge */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0, 0, 0, 0.3)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', color: 'var(--accent)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                              <span>T{item.tier}</span>
                            </div>

                            {/* Time Badge */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0, 0, 0, 0.3)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', color: '#888', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                              <Clock size={12} />
                              <span>{isGathering ? '3.0s' : '1.5s'}</span>
                            </div>

                            {/* XP Badge */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0, 0, 0, 0.3)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', color: '#888', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                              <Star size={12} />
                              <span>{item.xp} XP</span>
                            </div>

                            {/* Req Level Badge (Locked only) */}
                            {locked && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255, 68, 68, 0.1)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', color: '#ff4444', border: '1px solid rgba(255, 68, 68, 0.2)' }}>
                                <span>Req Lv {reqLevel}</span>
                              </div>
                            )}

                            {/* Ingredients Badge (Refining only) */}
                            {!isGathering && reqs && Object.entries(reqs).map(([reqId, reqQty]) => {
                              const userQty = (displayedGameState?.state?.inventory?.[reqId] || 0);
                              const hasEnough = userQty >= reqQty;
                              return (
                                <div key={reqId} style={{
                                  display: 'flex', alignItems: 'center', gap: '4px',
                                  background: hasEnough ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 68, 68, 0.1)',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '0.7rem',
                                  color: hasEnough ? '#4caf50' : '#ff4444',
                                  border: `1px solid ${hasEnough ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 68, 68, 0.2)'}`
                                }}>
                                  <span>{userQty}/{reqQty} {reqId}</span>
                                </div>
                              );
                            })}
                          </div>

                          <ActivityProgressBar
                            active={isActive}
                            nextActionAt={displayedGameState?.current_activity?.next_action_at}
                            duration={duration}
                            serverTimeOffset={clockOffset.current}
                          />
                          {isActive && (
                            <div style={{ fontSize: '0.6rem', color: 'var(--accent)', marginTop: '4px', textAlign: 'right', fontWeight: 'bold' }}>
                              RESTAM {displayedGameState.current_activity.actions_remaining}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      }

      case 'crafting': {
        const craftingItems = ITEMS.GEAR[activeCategory] || {};
        // ITEMS.GEAR[Category] returns { SWORD: {1:.., 2:..}, SHIELD: {1:..} }
        // We need to flatten this to get all items of the selected tier
        const allItemsInCategory = [];
        Object.values(craftingItems).forEach(itemTypeGroup => {
          Object.values(itemTypeGroup).forEach(item => {
            allItemsInCategory.push(item);
          });
        });

        const itemsToRender = allItemsInCategory.filter(i => i.tier === activeTier);
        return (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <SkillProgressHeader tab={activeTab} category={activeCategory} />
            <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: '16px', background: 'rgba(15, 20, 30, 0.4)' }}>
              <div style={{ padding: isMobile ? '20px' : '30px 40px', borderBottom: '1px solid var(--border)' }}>
                <h2 style={{ margin: 0, color: '#fff', fontSize: '1.2rem', fontWeight: '900', letterSpacing: '2px' }}>{activeCategory} CRAFTING</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', marginTop: '15px' }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(t => (
                    <button key={t} onClick={() => setActiveTier(t)} style={{ padding: '6px', background: activeTier === t ? 'var(--accent-soft)' : 'rgba(255,255,255,0.02)', border: '1px solid', borderColor: activeTier === t ? 'var(--border-active)' : 'rgba(255,255,255,0.05)', borderRadius: '4px', color: activeTier === t ? '#d4af37' : '#555', fontSize: '0.65rem', fontWeight: '900' }}>T{t}</button>
                  ))}
                </div>
              </div>
              <div className="scroll-container" style={{ padding: isMobile ? '20px' : '30px 40px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {itemsToRender.map(item => {
                    const reqs = item.req || {};
                    const stats = item.stats || {};
                    const mainStat = stats.damage ? { icon: <Sword size={12} />, val: `${stats.damage} Damage`, color: '#ff4444' }
                      : stats.defense ? { icon: <Shield size={12} />, val: `${stats.defense} Def`, color: '#4caf50' }
                        : stats.hp ? { icon: <Heart size={12} />, val: `${stats.hp} HP`, color: '#ff4444' } // Fallback HP
                          : null;

                    const locked = isLocked('CRAFTING', item);
                    const isActive = displayedGameState?.current_activity?.item_id === item.id;
                    const duration = (item.time || 3.0) * 1000;

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          if (!locked) {
                            setModalItem(item);
                            setModalType('CRAFTING');
                          }
                        }}
                        disabled={locked}
                        className="resource-card"
                        style={{
                          borderLeft: isActive ? '4px solid var(--accent)' : 'none',
                          display: 'flex',
                          gap: '12px',
                          alignItems: 'center',
                          padding: '12px',
                          opacity: locked ? 0.5 : 1,
                          cursor: locked ? 'not-allowed' : 'pointer',
                          filter: 'none',
                          background: isActive ? 'rgba(212, 175, 55, 0.05)' : 'rgba(0,0,0,0.2)',
                          width: '100%',
                          textAlign: 'left',
                          border: isActive ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.05)',
                          borderRadius: '8px',
                          marginBottom: '10px',
                          transition: 'all 0.2s ease',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                        onMouseEnter={(e) => { if (!locked && !isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                        onMouseLeave={(e) => { if (!locked && !isActive) e.currentTarget.style.background = 'rgba(0,0,0,0.2)'; }}
                      >
                        {/* Icon Container */}
                        <div style={{
                          width: '48px',
                          height: '48px',
                          background: 'rgba(255, 255, 255, 0.03)',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          flexShrink: 0
                        }}>
                          {locked ? <Lock size={20} color="#555" /> : <Layers size={20} style={{ opacity: 0.7 }} color="var(--accent)" />}
                        </div>

                        {/* Content */}
                        <div style={{ flex: '1 1 0%' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px', color: locked ? '#888' : (isActive ? 'var(--accent)' : '#eee') }}>
                              {item.name}
                              {isActive && <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 2 }} style={{ fontSize: '0.6rem', background: 'var(--accent)', color: '#000', padding: '1px 4px', borderRadius: '3px', fontWeight: '900' }}>ATIVO</motion.span>}
                            </span>
                          </div>

                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {/* Tier Badge */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0, 0, 0, 0.3)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', color: 'var(--accent)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                              <span>T{item.tier}</span>
                            </div>

                            {/* Time Badge */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0, 0, 0, 0.3)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', color: '#888', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                              <Clock size={12} />
                              <span>3.0s</span>
                            </div>

                            {/* XP Badge */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0, 0, 0, 0.3)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', color: '#888', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                              <Star size={12} />
                              <span>{item.xp} XP</span>
                            </div>

                            {/* Main Stat Badge */}
                            {mainStat && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0, 0, 0, 0.3)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', color: locked ? '#555' : mainStat.color, border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                {React.cloneElement(mainStat.icon, { size: 12, color: locked ? '#555' : mainStat.color })}
                                <span>{mainStat.val}</span>
                              </div>
                            )}

                            {/* Requirements Badges */}
                            {Object.entries(reqs).map(([reqId, reqQty]) => {
                              const userQty = (displayedGameState?.state?.inventory?.[reqId] || 0);
                              const hasEnough = userQty >= reqQty;
                              return (
                                <div key={reqId} style={{
                                  display: 'flex', alignItems: 'center', gap: '4px',
                                  background: hasEnough ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 68, 68, 0.1)',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '0.7rem',
                                  color: hasEnough ? '#4caf50' : '#ff4444',
                                  border: `1px solid ${hasEnough ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 68, 68, 0.2)'}`
                                }}>
                                  <span>{userQty}/{reqQty} {reqId}</span>
                                </div>
                              )
                            })}
                          </div>

                          <ActivityProgressBar
                            active={isActive}
                            nextActionAt={displayedGameState?.current_activity?.next_action_at}
                            duration={duration}
                          />
                          {isActive && (
                            <div style={{ fontSize: '0.6rem', color: 'var(--accent)', marginTop: '4px', textAlign: 'right', fontWeight: 'bold' }}>
                              RESTAM {displayedGameState.current_activity.actions_remaining}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      }
      case 'inventory':
        return <InventoryPanel gameState={displayedGameState} socket={socket} onEquip={handleEquip} onShowInfo={setInfoItem} onListOnMarket={handleListOnMarket} isMobile={isMobile} />;
      case 'ranking':
        return <RankingPanel socket={socket} isMobile={isMobile} />;
      case 'combat':
        return (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <SkillProgressHeader tab="combat" category="COMBAT" />
            <CombatPanel socket={socket} gameState={displayedGameState} isMobile={isMobile} />
          </div>
        );
      case 'dungeon':
        return (
          <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 20, 30, 0.4)' }}>
            <Castle size={48} color="#555" style={{ marginBottom: 20, opacity: 0.5 }} />
            <h2 style={{ margin: 0, color: '#fff', fontSize: '1.5rem', fontWeight: '900', letterSpacing: '2px', textTransform: 'uppercase' }}>Em Breve</h2>
            <p style={{ color: '#888', fontSize: '0.8rem', marginTop: 10, maxWidth: 300, textAlign: 'center' }}>
              As masmorras estão sendo escavadas. Prepare seus equipamentos!
            </p>
          </div>
        );
      default:
        return <div style={{ padding: 20, textAlign: 'center', color: '#555' }}>Selecione uma categoria</div>;
    }
  };

  const handleNavigate = (itemId) => {
    if (itemId === 'combat') {
      setActiveTab('combat');
      return;
    }
    // Procurar em Gathering
    for (const [category, tiers] of Object.entries(ITEMS.RAW)) {
      for (const [t, item] of Object.entries(tiers)) {
        if (item.id === itemId) {
          setActiveTab('gathering');
          setActiveCategory(category);
          setActiveTier(Number(t));
          setModalItem(null);
          return;
        }
      }
    }
    // Procurar em Refining
    for (const [category, tiers] of Object.entries(ITEMS.REFINED)) {
      for (const [t, item] of Object.entries(tiers)) {
        if (item.id === itemId) {
          setActiveTab('refining');
          setActiveCategory(category);
          setActiveTier(Number(t));
          setModalItem(null);
          return;
        }
      }
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0f', color: '#fff', fontFamily: "'Inter', sans-serif", position: 'relative', overflow: 'hidden' }}>
      <Sidebar
        gameState={displayedGameState}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        isMobile={isMobile}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSwitchCharacter={() => setCharacterSelected(false)}
      />

      {
        isMobile && sidebarOpen && (
          <div onClick={() => setSidebarOpen(false)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 998, backdropFilter: 'blur(4px)' }} />
        )
      }

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', overflow: 'hidden' }}>
        <header style={{ background: 'rgba(10, 14, 20, 0.4)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255, 255, 255, 0.03)', padding: isMobile ? '12px 20px' : '15px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 100 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {isMobile && <button onClick={() => setSidebarOpen(true)} style={{ color: '#fff', opacity: 0.6 }}><Menu size={24} /></button>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #d4af37 0%, #8a6d0a 100%)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User color="#000" size={16} />
              </div>
              <div style={{ fontWeight: '900', fontSize: isMobile ? '0.85rem' : '1rem', color: '#fff', letterSpacing: '2px' }}>{displayedGameState?.name?.toUpperCase() || 'AVENTUREIRO'}</div>
            </div>
          </div>
          <button onClick={handleLogout} style={{ color: '#fff', fontSize: '0.65rem', fontWeight: '900', letterSpacing: '1.5px', opacity: 0.4 }}>SAIR</button>
        </header>

        <main style={{ height: 'calc(100vh - 80px)', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: isMobile ? '10px' : '20px 30px', position: 'relative' }}>
          {error && <div style={{ background: 'rgba(255, 68, 68, 0.05)', color: '#ff4444', padding: '12px 20px', marginBottom: 25, borderRadius: 8, border: '1px solid rgba(255, 68, 68, 0.1)', fontSize: '0.8rem' }}>{error}</div>}
          {renderContent()}
        </main>
      </div>

      <ChatWidget socket={socket} user={session.user} characterName={displayedGameState?.name} isMobile={isMobile} />
      <ActivityWidget
        gameState={displayedGameState}
        onStop={() => socket.emit('stop_activity')}
        socket={socket}
        onNavigate={handleNavigate}
        serverTimeOffset={clockOffset.current}
      />
      <ActivityModal isOpen={!!modalItem} onClose={() => setModalItem(null)} item={modalItem} type={modalType} gameState={displayedGameState} onStart={startActivity} onNavigate={handleNavigate} />

      <ItemInfoModal item={infoItem} onClose={() => setInfoItem(null)} />
      {marketSellItem && (
        <MarketListingModal
          listingItem={marketSellItem}
          onClose={() => setMarketSellItem(null)}
          socket={socket}
        />
      )}
      <OfflineGainsModal isOpen={!!offlineReport} data={offlineReport} onClose={() => setOfflineReport(null)} />
    </div >
  );
}

const actionBtnStyle = {
  background: 'rgba(0, 0, 0, 0.2)',
  border: '1px solid rgba(255, 255, 255, 0.02)',
  padding: '18px 25px',
  borderRadius: '10px',
  color: '#fff',
  cursor: 'pointer',
  transition: '0.3s cubic-bezier(0.16, 1, 0.3, 1)',
  textAlign: 'left',
  outline: 'none',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px'
};

const ActivityProgressBar = ({ active, nextActionAt, duration, serverTimeOffset = 0 }) => {
  const [prog, setProg] = React.useState(0);

  React.useEffect(() => {
    if (!active || !nextActionAt) {
      setProg(0);
      return;
    }

    const tick = () => {
      const now = Date.now() + serverTimeOffset;
      const target = Number(nextActionAt);
      const remaining = target - now;
      const progress = Math.max(0, Math.min(100, (1 - (remaining / duration)) * 100));
      setProg(progress);
    };

    tick();
    const interval = setInterval(tick, 50);
    return () => clearInterval(interval);
  }, [active, nextActionAt, duration, serverTimeOffset]);

  return (
    <div style={{ marginTop: '10px', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
      <div style={{
        width: active ? `${prog}%` : '0%',
        height: '100%',
        background: active ? 'var(--accent)' : 'transparent',
        transition: 'none'
      }}></div>
    </div>
  );
};

export default App;
