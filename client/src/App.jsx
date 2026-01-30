import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { supabase } from './supabase';
import Auth from './components/Auth';
import CharacterSelection from './components/CharacterSelection';
import ChatWidget from './components/ChatWidget';
import Sidebar from './components/Sidebar';
import InventoryPanel from './components/InventoryPanel';
import ActivityWidget from './components/ActivityWidget';
import ProfilePanel from './components/ProfilePanel';
import ItemInfoModal from './components/ItemInfoModal';
import MarketPanel from './components/MarketPanel';
import ActivityModal from './components/ActivityModal';
import RankingPanel from './components/RankingPanel';
import DungeonPanel from './components/DungeonPanel';

import CombatPanel from './components/CombatPanel';
import OfflineGainsModal from './components/OfflineGainsModal';
import MarketListingModal from './components/MarketListingModal';
import CombatHistoryModal from './components/CombatHistoryModal';
import LootModal from './components/LootModal';
import BuffsDrawer from './components/BuffsDrawer';
import NotificationCenter from './components/NotificationCenter';
import {
  Zap, Package, User, Trophy, Coins,
  Axe, Pickaxe, Target, Shield, Sword,
  Star, Layers, Box, Castle, Lock, Menu, X, Tag, Clock, Heart, LogOut
} from 'lucide-react';
import { ITEMS, resolveItem, getSkillForItem, getLevelRequirement } from '@shared/items';
import { calculateNextLevelXP, XP_TABLE } from '@shared/skills';
import { motion, AnimatePresence } from 'framer-motion';
import { useOptimisticState } from './hooks/useOptimisticState';



const mapTabCategoryToSkill = (tab, category) => {
  const maps = {
    gathering: {
      WOOD: 'LUMBERJACK',
      ORE: 'ORE_MINER',
      HIDE: 'ANIMAL_SKINNER',
      FIBER: 'FIBER_HARVESTER',
      FISH: 'FISHING',
      HERB: 'HERBALISM'
    },
    refining: {
      PLANK: 'PLANK_REFINER',
      BAR: 'METAL_BAR_REFINER',
      LEATHER: 'LEATHER_REFINER',
      CLOTH: 'CLOTH_REFINER',
      EXTRACT: 'DISTILLATION'
    },
    crafting: {
      WARRIORS_FORGE: 'WARRIOR_CRAFTER',
      HUNTERS_LODGE: 'HUNTER_CRAFTER',
      MAGES_TOWER: 'MAGE_CRAFTER',
      COOKING_STATION: 'COOKING',
      ALCHEMY_LAB: 'ALCHEMY',
      TOOLMAKER: 'TOOL_CRAFTER'
    },
    combat: {
      COMBAT: 'COMBAT'
    }
  };
  return maps[tab.toLowerCase()]?.[category.toUpperCase()];
};

import { formatNumber, formatSilver } from '@utils/format';

function App() {
  const [session, setSession] = useState(null);
  const [socket, setSocket] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [connectionError, setConnectionError] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const clockOffset = useRef(0);
  const displayedGameState = useOptimisticState(gameState);
  const [error, setError] = useState('');
  const [initialAuthView, setInitialAuthView] = useState('LOGIN');
  // characterSelected is no longer needed, we use selectedCharacter (charId) as the source of truth

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
  const [marketFilter, setMarketFilter] = useState('');
  const [notifications, setNotifications] = useState([]);

  const [showNotifications, setShowNotifications] = useState(false);
  const [showCombatHistory, setShowCombatHistory] = useState(false);
  const [showFullNumbers, setShowFullNumbers] = useState(false);

  const [lootModalData, setLootModalData] = useState(null);

  useEffect(() => {
    if (gameState?.state?.notifications) {
      setNotifications(gameState.state.notifications);
    }
  }, [gameState]);

  const addNotification = (notif) => {
    setNotifications(prev => [{
      id: Date.now() + Math.random(),
      timestamp: Date.now(),
      read: false,
      ...notif
    }, ...prev].slice(0, 50));
  };

  const markAsRead = (id) => {
    socket?.emit('mark_notification_read', { notificationId: id });
  };

  const clearAllNotifications = () => {
    socket?.emit('clear_notifications');
  };

  const handleListOnMarket = (item) => {
    setMarketSellItem(item);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setModalItem(null);
        setInfoItem(null);
        setMarketSellItem(null);
        setOfflineReport(null);
        setSidebarOpen(false);
        setShowNotifications(false);
        setShowCombatHistory(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  // Update Last Active on Unload
  useEffect(() => {
    const handleUnload = () => {
      if (session?.access_token) {
        const url = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/update_last_active`;

        // Use sendBeacon for reliable unload requests (no CORS preflight if simple content type)
        if (navigator.sendBeacon) {
          const blob = new Blob([new URLSearchParams({ token: session.access_token }).toString()], { type: 'application/x-www-form-urlencoded' });
          navigator.sendBeacon(url, blob);
        } else {
          // Fallback
          fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            keepalive: true
          }).catch(err => console.error("Failed to update last active:", err));
        }
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [session]);

  const [selectedCharacter, setSelectedCharacter] = useState(() => localStorage.getItem('selectedCharacterId'));
  const [serverError, setServerError] = useState(null);

  // Auto-connect if session and character already exist
  useEffect(() => {
    if (session?.access_token && selectedCharacter && !socket) {
      console.log("Restoring character session:", selectedCharacter);
      setIsConnecting(true);
      connectSocket(session.access_token, selectedCharacter);
    }
  }, [session, selectedCharacter, socket]);

  // Auth Handling
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      // If we landed with an access token in the hash, clean it up
      if (window.location.hash && (window.location.hash.includes('access_token') || window.location.hash.includes('error'))) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'SIGNED_IN') {
        // Clear hash after successful OAuth/OTP landing
        if (window.location.hash && (window.location.hash.includes('access_token') || window.location.hash.includes('error'))) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      }
      if (event === 'PASSWORD_RECOVERY') {
        setInitialAuthView('RESET');
      }
      if (!session) {
        if (socket) socket.disconnect();
        setGameState(null);
        setSelectedCharacter(null);
        localStorage.removeItem('selectedCharacterId');
        setSocket(null);
        setInitialAuthView('LOGIN');
      }
    });

    return () => subscription.unsubscribe();
  }, [socket]);

  // Socket Connection Function
  const connectSocket = (token, characterId) => {
    if (socket?.connected) return;

    const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    // console.log('[DEBUG-CLIENT] Connecting to socket URL:', socketUrl);
    const newSocket = io(socketUrl, {
      auth: { token },
      transports: ['websocket']
    });

    newSocket.on('connect', () => {
      setConnectionError(null);
      setIsConnecting(false);
      // Join Character Room
      newSocket.emit('join_character', { characterId });
    });

    newSocket.on('disconnect', () => {
      setIsConnecting(true);
    });

    newSocket.on('connect_error', async (err) => {
      console.error('Connection error:', err);

      // If it's an auth error, try to refresh the session
      if (err.message?.includes('Authentication error') || err.message?.includes('Invalid token')) {
        // Prevent infinite fast loops by checking if we just tried this
        const lastAttempt = newSocket._lastAuthRetry || 0;
        const now = Date.now();
        if (now - lastAttempt < 2000) {
          console.warn('Auth retry too fast, waiting for standard timeout...');
        } else {
          console.log('Detected auth error, refreshing session...');
          newSocket._lastAuthRetry = now;

          // Force a session refresh
          const { data: { session: refreshedSession }, error } = await supabase.auth.refreshSession();

          if (refreshedSession && !error) {
            console.log('Session refreshed successfully');
            setSession(refreshedSession);
            newSocket.auth.token = refreshedSession.access_token;
            newSocket.connect();
            return;
          } else {
            console.error('Failed to auto-refresh session:', error);

            // Critical Fix: If Refresh Token is invalid/missing, we MUST log out to break the loop.
            const isFatalAuthError =
              error?.message?.includes('Refresh Token Not Found') ||
              error?.message?.includes('Invalid Refresh Token') ||
              error?.code === '400';

            if (isFatalAuthError) {
              console.log('Fatal Auth Error - Forcing Logout');
              await supabase.auth.signOut();
              setSession(null);
              setGameState(null);
              setSelectedCharacter(null);
              localStorage.removeItem('selectedCharacterId');
              setSocket(null);
              return;
            }
          }
        }
      }

      setConnectionError('Connection failed. Retrying in 5s...');
      setIsConnecting(true);
      setTimeout(() => {
        if (newSocket.disconnected) newSocket.connect();
      }, 5000);
    });

    newSocket.on('status_update', (status) => {
      // console.log('[DEBUG-CLIENT] status_update received. Notifications:', status.state?.notifications?.length);
      const now = Date.now();
      const serverTime = new Date(status.serverTime || now).getTime();
      clockOffset.current = now - serverTime;

      if (status.offlineReport) {
        setOfflineReport(status.offlineReport);
      }

      if (status.noCharacter) {
        console.warn("Character ID not found on server (Migration mismatch). Resetting selection.");
        localStorage.removeItem('selectedCharacterId');
        setSelectedCharacter(null);
        setGameState(null);
        return;
      }

      setGameState(status);
      setIsConnecting(false);
    });



    newSocket.on('error', (err) => {
      console.error('[SERVER-ERROR]', err);
      setServerError(err.message || 'An error occurred');
    });

    newSocket.on('item_used', (result) => {
      console.log('[CLIENT] Item used:', result);

      // If we have structure rewards, show the modal!
      if (result.rewards) {
        setLootModalData(result.rewards);
      } else if (result.message) {
        // Fallback for potions/food typical use
        addNotification({
          type: 'SYSTEM',
          message: result.message
        });
      }
    });

    // Attach other listeners if needed here or rely on the main socket instance updating
    setSocket(newSocket);
  };

  // Cleanup Socket on Unmount
  useEffect(() => {
    return () => {
      if (socket) socket.disconnect();
    }
  }, [socket]);

  const handleCharacterSelect = (charId) => {
    setSelectedCharacter(charId);
    localStorage.setItem('selectedCharacterId', charId);
    if (session?.access_token) {
      setIsConnecting(true); // Show loading
      connectSocket(session.access_token, charId);
    }
  };


  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('selectedCharacterId');
    setSession(null);
    setGameState(null);
    setSelectedCharacter(null);
  };

  const handleEquip = (itemId) => {
    if (socket) {
      socket.emit('equip_item', { itemId });
    }
  };

  const handleUseItem = (itemId, quantity = 1) => {
    console.log('[DEBUG-APP] handleUseItem called for:', itemId, 'Socket:', !!socket, 'Connected:', socket?.connected);
    if (socket) {
      socket.emit('use_item', { itemId, quantity });
    }
  };

  const handleUnequip = (slot) => {
    if (socket) {
      socket.emit('unequip_item', { slot });
    }
  };

  const startActivity = (type, itemId, quantity = 1) => {
    console.log(`[CLIENT] Requesting Start Activity: ${type}, Item: ${itemId}, Qty: ${quantity}`);
    socket.emit('start_activity', { actionType: type, itemId, quantity });
  };

  const claimReward = () => {
    socket.emit('claim_reward');
  };

  const isLocked = (type, item) => {
    if (!displayedGameState?.state || !item) return false;
    const tier = Number(item.tier) || 1;
    const skillKey = getSkillForItem(item.id, type);
    const userLevel = displayedGameState.state.skills?.[skillKey]?.level || 1;
    const requiredLevel = getLevelRequirement(tier);

    if (tier > 1) {
      // console.log(`[DEBUG-LOCK-LIST] ${item.id}: Tier=${tier}, Skill=${skillKey}, UserLv=${userLevel}, ReqLv=${requiredLevel}, LOCKED=${userLevel < requiredLevel}`);
    }

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
              {formatNumber((XP_TABLE[skill.level - 1] || 0) + skill.xp)} / {XP_TABLE[skill.level] ? formatNumber(XP_TABLE[skill.level]) : 'MAX'} XP
            </div>
          </div>
        </div>
        <div style={{ height: '3px', background: 'rgba(0,0,0,0.3)', borderRadius: '2px', overflow: 'hidden', marginTop: '10px' }}>
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              background: '#d4af37',
              boxShadow: '0 0 8px rgba(212, 175, 55, 0.3)',
              transition: 'width 0.2s ease-out'
            }}
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



  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfilePanel gameState={displayedGameState} session={session} socket={socket} onShowInfo={setInfoItem} isMobile={isMobile} />;
      case 'market':
        return <MarketPanel socket={socket} gameState={displayedGameState} silver={displayedGameState?.state?.silver || 0} onShowInfo={setInfoItem} onListOnMarket={handleListOnMarket} isMobile={isMobile} initialSearch={marketFilter} />;
      case 'gathering':
      case 'refining': {
        const isGathering = activeTab === 'gathering';
        const activeCategoryData = isGathering ? ITEMS.RAW[activeCategory] : ITEMS.REFINED[activeCategory];
        const itemsToRender = Object.values(activeCategoryData || {}).filter(item => item.tier === activeTier);

        if (!activeCategoryData || Object.keys(activeCategoryData).length === 0) {
          return (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <SkillProgressHeader tab={activeTab} category={activeCategory} />
              <div className="glass-panel" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '16px', background: 'rgba(15, 20, 30, 0.4)' }}>
                <div style={{ textAlign: 'center', opacity: 0.5 }}>
                  <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🧪</div>
                  <h2 style={{ color: '#d4af37', fontSize: '1.5rem', fontWeight: '900', letterSpacing: '2px' }}>COMING SOON</h2>
                  <p style={{ color: '#888' }}>Alchemy system in development.</p>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <SkillProgressHeader tab={activeTab} category={activeCategory} />
            <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: '16px', background: 'rgba(15, 20, 30, 0.4)' }}>
              <div style={{ padding: isMobile ? '20px' : '30px 40px', borderBottom: '1px solid var(--border)' }}>
                <h2 style={{ margin: 0, color: '#fff', fontSize: '1.2rem', fontWeight: '900', letterSpacing: '2px' }}>
                  {activeCategory} {isGathering ? 'GATHERING' : 'REFINING'}
                </h2>
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
                    const duration = (item.time || (isGathering ? 3.0 : 1.5)) * 1000;

                    const skillKey = mapTabCategoryToSkill(activeTab, activeCategory);
                    const skill = displayedGameState?.state?.skills?.[skillKey] || { level: 1, xp: 0 };
                    const nextXP = calculateNextLevelXP(skill.level);
                    const skillProgress = (skill.xp / nextXP) * 100;

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setModalItem(item);
                          setModalType(isGathering ? 'GATHERING' : 'REFINING');
                        }}
                        disabled={false}
                        className="resource-card"
                        style={{
                          borderLeft: isActive ? '4px solid var(--accent)' : 'none',
                          display: 'flex',
                          gap: '12px',
                          alignItems: 'center',
                          padding: '12px',
                          opacity: locked ? 0.7 : 1,
                          cursor: 'pointer',
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
                          flexShrink: 0,
                          overflow: 'hidden'
                        }}>
                          {item.icon ? (
                            <img
                              src={item.icon}
                              alt={item.name}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                                filter: locked ? 'grayscale(100%) opacity(0.5)' : 'none'
                              }}
                            />
                          ) : (
                            isGathering ? (
                              <Pickaxe size={24} style={{ opacity: 0.7 }} color={locked ? '#555' : 'var(--accent)'} />
                            ) : (
                              <Box size={24} style={{ opacity: 0.7 }} color={locked ? '#555' : 'var(--accent)'} />
                            )
                          )}
                        </div>

                        {/* Content */}
                        <div style={{ flex: '1 1 0%' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px', color: locked ? '#888' : (isActive ? 'var(--accent)' : '#eee') }}>
                              {item.name}
                              {locked && <Lock size={14} color="#ff4444" />}
                              {isActive && <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 2 }} style={{ fontSize: '0.6rem', background: 'var(--accent)', color: '#000', padding: '1px 4px', borderRadius: '3px', fontWeight: '900' }}>ACTIVE</motion.span>}
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
                              <span>{item.time || (isGathering ? '3.0' : '1.5')}s</span>
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

                          {isActive && (
                            <ActivityProgressBar
                              activity={displayedGameState.current_activity}
                              serverTimeOffset={clockOffset.current}
                            />
                          )}
                          {isActive && (
                            <div style={{ fontSize: '0.6rem', color: 'var(--accent)', marginTop: '4px', textAlign: 'right', fontWeight: 'bold' }}>
                              {displayedGameState.current_activity.initial_quantity - displayedGameState.current_activity.actions_remaining}/{displayedGameState.current_activity.initial_quantity}
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

        if (!craftingItems || Object.keys(craftingItems).length === 0) {
          return (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <SkillProgressHeader tab={activeTab} category={activeCategory} />
              <div className="glass-panel" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '16px', background: 'rgba(15, 20, 30, 0.4)' }}>
                <div style={{ textAlign: 'center', opacity: 0.5 }}>
                  <div style={{ fontSize: '3rem', marginBottom: '10px' }}>⚗️</div>
                  <h2 style={{ color: '#d4af37', fontSize: '1.5rem', fontWeight: '900', letterSpacing: '2px' }}>COMING SOON</h2>
                  <p style={{ color: '#888' }}>Alchemy Lab under construction.</p>
                </div>
              </div>
            </div>
          );
        }
        return (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <SkillProgressHeader tab={activeTab} category={activeCategory} />
            <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: '16px', background: 'rgba(15, 20, 30, 0.4)' }}>
              <div style={{ padding: isMobile ? '20px' : '30px 40px', borderBottom: '1px solid var(--border)' }}>
                <h2 style={{ margin: 0, color: '#fff', fontSize: '1.2rem', fontWeight: '900', letterSpacing: '2px' }}>
                  {activeCategory} CRAFTING
                </h2>
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
                    const mainStat = item.heal ? { icon: <Heart size={12} />, val: `${item.heal} Heal`, color: '#4caf50' }
                      : stats.damage ? { icon: <Sword size={12} />, val: `${stats.damage} Damage`, color: '#ff4444' }
                        : stats.defense ? { icon: <Shield size={12} />, val: `${stats.defense} Def`, color: '#4caf50' }
                          : stats.hp ? { icon: <Heart size={12} />, val: `${stats.hp} HP`, color: '#ff4444' } // Fallback HP
                            : null;

                    const type = activeTab.toUpperCase();
                    const locked = isLocked(type, item);
                    const reqLevel = getLevelRequirement(item.tier);
                    const isActive = displayedGameState?.current_activity?.item_id === item.id;
                    const duration = (item.time || 3.0) * 1000;

                    const skillKey = mapTabCategoryToSkill(activeTab, activeCategory);
                    const skill = displayedGameState?.state?.skills?.[skillKey] || { level: 1, xp: 0 };
                    const nextXP = calculateNextLevelXP(skill.level);
                    const skillProgress = (skill.xp / nextXP) * 100;

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setModalItem(item);
                          setModalType('CRAFTING');
                        }}

                        className="resource-card"
                        style={{
                          borderLeft: isActive ? '4px solid var(--accent)' : 'none',
                          display: 'flex',
                          gap: '12px',
                          alignItems: 'center',
                          padding: '12px',
                          opacity: locked ? 0.7 : 1,
                          cursor: 'pointer',
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
                          flexShrink: 0,
                          overflow: 'hidden'
                        }}>
                          {item.icon ? (
                            <img
                              src={item.icon}
                              alt={item.name}
                              style={{
                                width: '130%',
                                height: '130%',
                                objectFit: 'contain',
                                filter: locked ? 'grayscale(100%) opacity(0.5)' : 'none'
                              }}
                            />
                          ) : (
                            locked ? <Lock size={20} color="#555" /> : <Layers size={20} style={{ opacity: 0.7 }} color="var(--accent)" />
                          )}
                        </div>

                        {/* Content */}
                        <div style={{ flex: '1 1 0%' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px', color: locked ? '#888' : (isActive ? 'var(--accent)' : '#eee') }}>
                              {item.name}
                              {isActive && <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 2 }} style={{ fontSize: '0.6rem', background: 'var(--accent)', color: '#000', padding: '1px 4px', borderRadius: '3px', fontWeight: '900' }}>ACTIVE</motion.span>}
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
                              <span>{item.time || 3.0}s</span>
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

                            {/* Potion Description Badge */}
                            {item.desc && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(212, 175, 55, 0.1)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', color: '#d4af37', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
                                <Zap size={12} />
                                <span>{item.desc}</span>
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

                          {isActive && (
                            <ActivityProgressBar
                              activity={displayedGameState.current_activity}
                              serverTimeOffset={clockOffset.current}
                            />
                          )}
                          {isActive && (
                            <div style={{ fontSize: '0.6rem', color: 'var(--accent)', marginTop: '4px', textAlign: 'right', fontWeight: 'bold' }}>
                              {displayedGameState.current_activity.initial_quantity - displayedGameState.current_activity.actions_remaining}/{displayedGameState.current_activity.initial_quantity}
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
        return <InventoryPanel gameState={displayedGameState} socket={socket} onEquip={handleEquip} onShowInfo={setInfoItem} onListOnMarket={handleListOnMarket} onUse={handleUseItem} isMobile={isMobile} />;
      case 'ranking':
        return <RankingPanel socket={socket} isMobile={isMobile} />;
      case 'combat':
        return (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <SkillProgressHeader tab="combat" category="COMBAT" />
            <CombatPanel socket={socket} gameState={displayedGameState} isMobile={isMobile} onShowHistory={() => setShowCombatHistory(true)} />
          </div>
        );
      case 'dungeon':
        return <DungeonPanel socket={socket} gameState={displayedGameState} isMobile={isMobile} serverTimeOffset={clockOffset.current} />;
      default:
        return <div style={{ padding: 20, textAlign: 'center', color: '#555' }}>Select a category</div>;
    }
  };

  const handleNavigate = (itemId) => {
    if (itemId === 'combat') {
      setActiveTab('combat');
      return;
    }
    if (itemId === 'dungeon') {
      setActiveTab('dungeon');
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

    // Procurar em Crafting/Gear
    for (const [stationKey, itemTypes] of Object.entries(ITEMS.GEAR)) {
      for (const [itemType, tiers] of Object.entries(itemTypes)) {
        for (const [t, item] of Object.entries(tiers)) {
          if (item.id === itemId) {
            setActiveTab('crafting');
            setActiveCategory(stationKey); // stationKey ex: WARRIORS_FORGE
            setActiveTier(Number(t));
            setModalItem(null);
            return;
          }
        }
      }
    }
  };

  const handleSearchInMarket = (itemName) => {
    setMarketFilter(itemName);
    setActiveTab('market');
    setModalItem(null);
  };



  if (!session || initialAuthView === 'RESET') {
    return <Auth onLogin={setSession} initialView={initialAuthView} />;
  }

  if (!selectedCharacter) {
    return <CharacterSelection onSelectCharacter={handleCharacterSelect} />;
  }

  // Loading state while connecting
  if (!gameState && isConnecting) {
    return <div className="loading-screen"><div className="spinner"></div>Connecting to World...</div>;
  }

  // Guard: if invalid state
  if (!gameState || !gameState.state) {
    return <div className="loading-screen"><div className="spinner"></div>Loading Game State...</div>;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0f', color: '#fff', fontFamily: "'Inter', sans-serif", position: 'relative' }}>
      <Sidebar
        gameState={displayedGameState}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        isMobile={isMobile}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSwitchCharacter={() => {
          if (socket) socket.disconnect();
          setSelectedCharacter(null);
          localStorage.removeItem('selectedCharacterId');
          setGameState(null);
          setSocket(null);
        }}
      />

      {
        isMobile && sidebarOpen && (
          <div onClick={() => setSidebarOpen(false)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 998, backdropFilter: 'blur(4px)' }} />
        )
      }

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', minHeight: 0 }}>
        <header style={{
          position: 'sticky',
          top: 0,
          background: 'rgba(10, 14, 20, 0.4)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
          padding: isMobile ? '12px 15px' : '15px 40px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 100,
          flexWrap: 'nowrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, minWidth: 0 }}>
            {isMobile && <button onClick={() => setSidebarOpen(true)} style={{ color: '#fff', opacity: 0.6 }}><Menu size={24} /></button>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #d4af37 0%, #8a6d0a 100%)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <User color="#000" size={16} />
              </div>
              <div style={{ fontWeight: '900', fontSize: isMobile ? '0.85rem' : '1rem', color: '#fff', letterSpacing: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: isMobile ? '90px' : '200px' }}>{displayedGameState?.name?.toUpperCase() || 'ADVENTURER'}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 20 }}>
            <button
              onClick={() => setShowFullNumbers(!showFullNumbers)}
              style={{
                background: 'rgba(212, 175, 55, 0.08)',
                border: '1px solid rgba(212, 175, 55, 0.2)',
                borderRadius: '8px',
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                marginRight: isMobile ? '4px' : '8px',
                transition: '0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(212, 175, 55, 0.15)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(212, 175, 55, 0.08)'}
            >
              <Coins size={16} color="#d4af37" />
              <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#d4af37', fontFamily: 'monospace' }}>
                {showFullNumbers
                  ? formatNumber(displayedGameState?.state?.silver || 0)
                  : formatSilver(displayedGameState?.state?.silver || 0)}
              </span>
            </button>

            <NotificationCenter
              notifications={notifications}
              isOpen={showNotifications}
              onClose={() => setShowNotifications(false)}
              onMarkAsRead={markAsRead}
              onClearAll={clearAllNotifications}
              onClickTrigger={() => setShowNotifications(!showNotifications)}
            />
            <button onClick={handleLogout} style={{ color: '#fff', fontSize: '0.65rem', fontWeight: '900', padding: isMobile ? '8px' : '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)', letterSpacing: '1.5px', opacity: 0.6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isMobile ? <LogOut size={16} /> : 'LOGOUT'}
            </button>
          </div>
        </header>

        <main style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          padding: isMobile ? '10px' : '20px 30px',
          position: 'relative',
          minHeight: 0,
          maxWidth: isMobile ? '100vw' : '1440px',
          margin: '0 auto',
          width: '100%'
        }}>
          {error && <div style={{ background: 'rgba(255, 68, 68, 0.05)', color: '#ff4444', padding: '12px 20px', marginBottom: 25, borderRadius: 8, border: '1px solid rgba(255, 68, 68, 0.1)', fontSize: '0.8rem' }}>{error}</div>}

          {renderContent()}
        </main>
      </div>

      <ChatWidget socket={socket} user={session.user} characterName={displayedGameState?.name} isMobile={isMobile} />
      <BuffsDrawer gameState={displayedGameState} isMobile={isMobile} />
      <ActivityWidget
        gameState={displayedGameState}
        onStop={() => socket.emit('stop_activity')}
        socket={socket}
        onNavigate={handleNavigate}
        isMobile={isMobile}
        serverTimeOffset={clockOffset.current}
        skillProgress={gameState?.current_activity && displayedGameState?.state?.skills ? (displayedGameState.state.skills[getSkillForItem(gameState.current_activity.item_id, gameState.current_activity.type)]?.xp / calculateNextLevelXP(displayedGameState.state.skills[getSkillForItem(gameState.current_activity.item_id, gameState.current_activity.type)]?.level || 1)) * 100 : 0}
      />
      {modalItem && (
        <ActivityModal
          isOpen={!!modalItem}
          onClose={() => setModalItem(null)}
          item={modalItem}
          type={modalType}
          gameState={displayedGameState}
          onStart={startActivity}
          onNavigate={handleNavigate}
          onSearchInMarket={handleSearchInMarket}
        />
      )}

      <ItemInfoModal item={infoItem} onClose={() => setInfoItem(null)} />
      {marketSellItem && (
        <MarketListingModal
          listingItem={marketSellItem}
          onClose={() => setMarketSellItem(null)}
          socket={socket}
        />
      )}
      <OfflineGainsModal
        isOpen={!!offlineReport}
        data={offlineReport}
        onClose={() => {
          setOfflineReport(null);
          if (socket) {
            socket.emit('acknowledge_offline_report');
          }
        }}
      />
      <CombatHistoryModal
        isOpen={showCombatHistory}
        onClose={() => setShowCombatHistory(false)}
        socket={socket}
      />

      <LootModal
        isOpen={!!lootModalData}
        onClose={() => setLootModalData(null)}
        rewards={lootModalData}
      />

      <AnimatePresence>
        {serverError && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(5px)'
          }}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{
                background: 'rgba(25, 25, 30, 0.95)',
                border: '1px solid #ff444466',
                borderRadius: '16px',
                padding: '30px',
                width: '90%',
                maxWidth: '400px',
                textAlign: 'center',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                position: 'relative'
              }}
            >
              <div style={{
                width: '60px',
                height: '60px',
                background: 'rgba(255, 68, 68, 0.1)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                border: '1px solid rgba(255, 68, 68, 0.2)'
              }}>
                <X color="#ff4444" size={32} />
              </div>
              <h2 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: '900', marginBottom: '10px' }}>SYSTEM ERROR</h2>
              <p style={{ color: '#aaa', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '25px' }}>
                {serverError}
              </p>
              <button
                onClick={() => setServerError(null)}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#ff4444',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: '0.2s',
                  boxShadow: '0 4px 12px rgba(255, 68, 68, 0.3)'
                }}
                onMouseOver={(e) => e.target.style.background = '#ff5555'}
                onMouseOut={(e) => e.target.style.background = '#ff4444'}
              >
                CLOSE
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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

const ActivityProgressBar = ({ activity, serverTimeOffset = 0 }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!activity) return;

    const update = () => {
      const now = Date.now() + serverTimeOffset;
      const initialQty = activity.initial_quantity || 1;
      const remainingQty = activity.actions_remaining;
      const doneQty = initialQty - remainingQty;
      const timePerAction = activity.time_per_action || 3;

      let currentItemProgressPercent = 0;

      // Calculate progress of current item
      if (activity.next_action_at) {
        const endTime = new Date(activity.next_action_at).getTime();
        const timeRemaining = endTime - now;
        const totalActionTime = timePerAction * 1000;

        // Invert: 0 remaining = 100% done
        const timeDone = totalActionTime - timeRemaining;

        // Clamp between 0 and 1
        const rawProgress = Math.max(0, Math.min(1, timeDone / totalActionTime));
        currentItemProgressPercent = rawProgress;
      }

      // Total Progress = (Done Items + Current Fraction) / Total Items
      // e.g. 5 items done, 0.5 of 6th item done. Total 10.
      // (5 + 0.5) / 10 = 55%

      const realTotalProgress = ((doneQty + currentItemProgressPercent) / initialQty) * 100;
      setProgress(Math.min(100, Math.max(0, realTotalProgress)));
    };

    const interval = setInterval(update, 50); // 20fps for smooth enough bar
    update();

    return () => clearInterval(interval);
  }, [activity, serverTimeOffset]);

  return (
    <div style={{ marginTop: '10px', height: '6px', background: 'rgba(0,0,0,0.3)', borderRadius: '3px', overflow: 'hidden' }}>
      <div style={{
        width: `${progress}%`,
        height: '100%',
        background: 'linear-gradient(90deg, #d4af37, #f2d06b)',
        transition: 'width 0.1s linear', // Faster transition for smoother updates
        boxShadow: '0 0 8px rgba(212, 175, 55, 0.3)'
      }}></div>
      <div style={{ fontSize: '0.6rem', textAlign: 'right', color: '#aaa', marginTop: '2px' }}>
        {progress.toFixed(1)}%
      </div>
    </div>
  );
};

export default App;
