import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Swords, Crosshair, Wallet, ChevronRight, Zap, Menu, Bomb, Shield, X, Coins } from 'lucide-react';
import { useLaunchParams } from '@telegram-apps/sdk-react';

// Адрес твоего бэкенда на Render
const API_URL = "https://reaperbet-backend.onrender.com";

const useSafeLaunchParams = () => {
  try {
    const params = useLaunchParams();
    const user = (params as any)?.initData?.user || (params as any)?.tgWebAppData?.user;
    return { user };
  } catch (e) {
    return { user: null };
  }
};

const GAMES = [
  { id: 'mines', name: 'Mines', icon: Bomb, color: 'from-red-500/20 to-orange-500/5' },
  { id: 'crash', name: 'Crash', icon: Zap, color: 'from-lime-500/20 to-green-500/5' },
  { id: 'pvp', name: 'PvP Arena', icon: Swords, color: 'from-teal-500/20 to-cyan-500/5' },
];

export default function App() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user: tgUser } = useSafeLaunchParams();
  
  // Стейты юзера
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  
  // Стейты навигации
  const [activeGame, setActiveGame] = useState<string | null>(null);
  
  // Стейты для Mines
  const [bet, setBet] = useState(100);
  const [minesCount, setMinesCount] = useState(3);
  const [isPlaying, setIsPlaying] = useState(false);
  const [grid, setGrid] = useState<('hidden'|'safe'|'mine')[]>(Array(25).fill('hidden'));
  const [currentWin, setCurrentWin] = useState(0);
  const [multiplier, setMultiplier] = useState(1.0);

  // Стейты для Скрытой Админки
  const [adminClicks, setAdminClicks] = useState(0);
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminTarget, setAdminTarget] = useState('');
  const [adminAmount, setAdminAmount] = useState('1000');

  // Авторизация
  useEffect(() => {
    // @ts-ignore
    const tg = window.Telegram?.WebApp;
    tg?.expand();
    
    // @ts-ignore
    const initData = tg?.initData || "";
    
    if (initData) {
      fetch(`${API_URL}/api/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData })
      })
      .then(res => res.json())
      .then(data => {
        setUser(data);
        setBalance(data.balance);
      })
      .catch(err => console.error("Auth error", err));
    } else {
      // Фоллбек для теста в браузере (если открываешь без Телеги)
      setUser({ first_name: 'Test', username: 'test', is_admin: true });
      setBalance(10000);
    }
  }, []);

  const handleLogoClick = () => {
    const newClicks = adminClicks + 1;
    setAdminClicks(newClicks);
    if (newClicks >= 5) {
      if (user?.is_admin || user?.id === 7554546588) setShowAdmin(true);
      setAdminClicks(0);
    }
    setTimeout(() => setAdminClicks(0), 2000);
  };

  const startGame = async () => {
    // @ts-ignore
    const initData = window.Telegram?.WebApp?.initData || "";
    if (!initData) return alert("Открой в Телеграме!");
    
    try {
      const res = await fetch(`${API_URL}/api/game/mines/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, bet, mines: minesCount })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      
      setBalance(data.balance);
      setGrid(Array(25).fill('hidden'));
      setIsPlaying(true);
      setCurrentWin(0);
      setMultiplier(1.0);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const clickCell = async (index: number) => {
    if (!isPlaying || grid[index] !== 'hidden') return;
    
    // @ts-ignore
    const initData = window.Telegram?.WebApp?.initData || "";
    
    try {
      const res = await fetch(`${API_URL}/api/game/mines/click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, cell_index: index })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      
      const newGrid = [...grid];
      if (data.status === 'mine') {
        newGrid[index] = 'mine';
        setGrid(newGrid);
        setIsPlaying(false);
        setBalance(data.balance);
        setTimeout(() => alert("Бум! Вы проиграли."), 300);
      } else if (data.status === 'win') {
        newGrid[index] = 'safe';
        setGrid(newGrid);
        setIsPlaying(false);
        setBalance(data.balance);
        setTimeout(() => alert(`Победа! Вы выиграли ${data.amount}`), 300);
      } else {
        newGrid[index] = 'safe';
        setGrid(newGrid);
        setMultiplier(data.multiplier);
        setCurrentWin(data.current_win);
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const cashout = async () => {
    if (!isPlaying || currentWin <= 0) return;
    
    // @ts-ignore
    const initData = window.Telegram?.WebApp?.initData || "";
    try {
      const res = await fetch(`${API_URL}/api/game/mines/cashout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      
      setBalance(data.balance);
      setIsPlaying(false);
      alert(`Вы забрали ${data.amount}!`);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleAdminGive = async () => {
    // @ts-ignore
    const initData = window.Telegram?.WebApp?.initData || "";
    try {
      const res = await fetch(`${API_URL}/api/admin/give`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, target_tg_id: parseInt(adminTarget), amount: parseInt(adminAmount) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      alert("Баблишко начислено! Новый баланс цели: " + data.new_balance);
      setShowAdmin(false);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const userName = user ? user.first_name : (tgUser ? tgUser.first_name : 'Guest');
  const userHandle = user?.username ? `@${user.username}` : (tgUser?.username ? `@${tgUser.username}` : '@guest');

  return (
    <div className="flex h-screen w-full bg-reaper-bg text-reaper-text font-sans selection:bg-reaper-glow/30 overflow-hidden">
      
      {/* АДМИН МОДАЛКА */}
      <AnimatePresence>
        {showAdmin && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{scale:0.9}} animate={{scale:1}} className="bg-reaper-surface border border-reaper-green p-6 rounded-2xl w-full max-w-md shadow-[0_0_50px_rgba(63,174,122,0.2)]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-display font-bold text-xl text-reaper-glow">Админ-панель</h3>
                <button onClick={() => setShowAdmin(false)} className="text-reaper-muted hover:text-white"><X size={20}/></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-reaper-muted uppercase">Telegram ID</label>
                  <input type="number" value={adminTarget} onChange={e=>setAdminTarget(e.target.value)} placeholder="ID жертвы" className="w-full bg-black/50 border border-reaper-border rounded-lg p-3 mt-1 text-white outline-none focus:border-reaper-glow"/>
                </div>
                <div>
                  <label className="text-xs text-reaper-muted uppercase">Сумма</label>
                  <input type="number" value={adminAmount} onChange={e=>setAdminAmount(e.target.value)} className="w-full bg-black/50 border border-reaper-border rounded-lg p-3 mt-1 text-white outline-none focus:border-reaper-glow"/>
                </div>
                <button onClick={handleAdminGive} className="w-full bg-reaper-green hover:bg-reaper-glow text-black font-bold py-3 rounded-lg transition-colors">
                  Выдать
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* МОБИЛЬНЫЙ САЙДБАР */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.aside 
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 h-full w-72 glass-panel z-50 flex flex-col p-6 lg:hidden border-r border-reaper-border/50"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="font-display font-bold text-xl tracking-wider text-glow">REAPER</h2>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 glass-button rounded-lg text-reaper-muted hover:text-white">
                  <Menu className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto no-scrollbar space-y-2">
                <p className="text-xs uppercase tracking-widest text-reaper-muted mb-4 font-semibold">Меню с играми</p>
                {GAMES.map(game => (
                  <button key={game.id} onClick={() => {setActiveGame(game.id); setIsPlaying(false); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 p-3 rounded-xl glass-button text-left group ${activeGame === game.id ? 'border-reaper-glow/50 bg-reaper-border/40' : ''}`}>
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${game.color} border border-reaper-border/50`}>
                      <game.icon className="w-4 h-4 text-reaper-glow" />
                    </div>
                    <span className="font-medium">{game.name}</span>
                    <ChevronRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>

              <div className="mt-auto pt-6 border-t border-reaper-border/50">
                <p className="text-xs uppercase tracking-widest text-reaper-muted mb-4 font-semibold">Аккаунт</p>
                <button className="w-full flex items-center gap-3 p-3 rounded-xl glass-button">
                  <div className="w-8 h-8 rounded-full bg-reaper-border flex items-center justify-center">
                    <User className="w-4 h-4 text-reaper-glow" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium">{userName}</p>
                    <p className="text-xs text-reaper-muted">{userHandle}</p>
                  </div>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ДЕСКТОПНЫЙ САЙДБАР */}
      <aside className="hidden lg:flex w-72 flex-col border-r border-reaper-border/50 bg-reaper-surface/20 backdrop-blur-3xl z-10 shrink-0">
        <div className="h-20 flex items-center px-6 border-b border-reaper-border/50 cursor-pointer select-none" onClick={handleLogoClick}>
          <h2 className="font-display font-bold text-xl tracking-wider text-glow">REAPER</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-2">
          <p className="text-xs uppercase tracking-widest text-reaper-muted mb-4 font-semibold">Меню с играми</p>
          {GAMES.map(game => (
            <button key={game.id} onClick={() => {setActiveGame(game.id); setIsPlaying(false);}} className={`w-full flex items-center gap-3 p-3 rounded-xl glass-button text-left group ${activeGame === game.id ? 'border-reaper-glow/50 bg-reaper-border/40' : ''}`}>
              <div className={`p-2 rounded-lg bg-gradient-to-br ${game.color} border border-reaper-border/50`}>
                <game.icon className="w-4 h-4 text-reaper-glow" />
              </div>
              <span className="font-medium">{game.name}</span>
              <ChevronRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>

        <div className="p-6 border-t border-reaper-border/50">
          <p className="text-xs uppercase tracking-widest text-reaper-muted mb-4 font-semibold">Аккаунт</p>
          <button className="w-full flex items-center gap-3 p-3 rounded-xl glass-button">
            <div className="w-8 h-8 rounded-full bg-reaper-border flex items-center justify-center">
              <User className="w-4 h-4 text-reaper-glow" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium">{userName}</p>
              <p className="text-xs text-reaper-muted">{userHandle}</p>
            </div>
          </button>
        </div>
      </aside>

      {/* ОСНОВНОЙ КОНТЕНТ */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* ХЕДЕР */}
        <header className="h-20 flex items-center justify-between px-4 lg:px-8 border-b border-reaper-border/50 bg-reaper-bg/50 backdrop-blur-xl z-10 sticky top-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 glass-button rounded-lg text-reaper-muted"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden lg:flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-reaper-surface border border-reaper-border flex items-center justify-center shadow-glow-green">
                <Crosshair className="w-6 h-6 text-reaper-glow" />
              </div>
              <div>
                <h1 className="font-display font-bold text-lg leading-tight tracking-wide">ReaperBet</h1>
                <p className="text-xs text-reaper-muted">Твой азарт. Твоя игра.</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl glass-button">
              <Wallet className="w-4 h-4 text-reaper-gold" />
              <span className="font-mono font-medium text-reaper-gold">{balance}</span>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-reaper-green/20 border border-reaper-green/50 hover:bg-reaper-green/30 transition-all text-sm font-medium text-reaper-glow shadow-glow-green">
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">Пополнить</span>
            </button>
          </div>
        </header>

        {/* ОСНОВНОЕ МЕНЮ (ЦЕНТР) */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 lg:p-8 relative">
          <AnimatePresence mode="wait">
            {activeGame === 'mines' ? (
              <motion.div key="mines" initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0}} className="max-w-md mx-auto">
                <button onClick={() => {setActiveGame(null); setIsPlaying(false);}} className="text-sm text-reaper-muted hover:text-white mb-6 flex items-center gap-2">
                  <ChevronRight className="rotate-180 w-4 h-4"/> Назад в меню
                </button>
                
                <div className="glass-panel p-6 rounded-2xl mb-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-display text-2xl font-bold">Mines</h2>
                    {isPlaying && (
                      <button onClick={cashout} className="bg-reaper-glow text-black px-4 py-2 rounded-lg font-bold text-sm shadow-glow-green flex items-center gap-1">
                        <Coins size={16}/> Забрать {currentWin}
                      </button>
                    )}
                  </div>
                  
                  {!isPlaying ? (
                    <div className="space-y-6">
                      <div>
                        <label className="text-xs text-reaper-muted uppercase mb-2 block">Ставка</label>
                        <input type="number" value={bet} onChange={e=>setBet(Number(e.target.value))} className="w-full bg-black/50 border border-reaper-border rounded-lg p-3 text-white outline-none focus:border-reaper-glow font-mono"/>
                      </div>
                      
                      <div>
                        <label className="text-xs text-reaper-muted uppercase mb-2 block">Количество мин</label>
                        <div className="flex gap-2 flex-wrap">
                          {[3, 5, 8, 15, 24].map(m => (
                            <button key={m} onClick={() => setMinesCount(m)} className={`flex-1 py-2 rounded-lg border font-bold text-sm transition-colors ${minesCount === m ? 'bg-reaper-glow border-reaper-glow text-black' : 'bg-black/40 border-reaper-border text-reaper-muted hover:text-white'}`}>
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button onClick={startGame} className="w-full bg-reaper-glow text-black font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(63,174,122,0.3)] hover:scale-[1.02] transition-transform">
                        Начать игру
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="grid grid-cols-5 gap-2 mt-2">
                        {grid.map((cell, i) => (
                          <button key={i} onClick={() => clickCell(i)} className={`aspect-square rounded-lg flex items-center justify-center text-xl font-bold transition-all
                            ${cell === 'hidden' ? 'bg-reaper-surface border border-reaper-border/80 hover:bg-reaper-border' : ''}
                            ${cell === 'safe' ? 'bg-reaper-glow text-black shadow-glow-green' : ''}
                            ${cell === 'mine' ? 'bg-red-500/20 border border-red-500 text-red-500' : ''}
                          `}>
                            {cell === 'safe' && <Shield size={24} />}
                            {cell === 'mine' && <Bomb size={24} />}
                          </button>
                        ))}
                      </div>
                      <div className="mt-4 text-center text-sm text-reaper-muted">
                        Текущий коэффициент: <span className="text-reaper-glow font-bold">{multiplier.toFixed(2)}x</span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div key="menu" initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0}} className="max-w-5xl mx-auto">
                <div className="text-center mb-12 mt-8">
                  <h2 className="font-display font-extrabold text-4xl md:text-6xl mb-4 tracking-tight">
                    ОСНОВНОЕ <span className="text-reaper-glow text-glow">МЕНЮ</span>
                  </h2>
                  <p className="text-reaper-muted max-w-md mx-auto">
                    Выбери свою игру. Рискни всем. Забери выигрыш.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {GAMES.map((game, idx) => (
                    <motion.button
                      key={game.id}
                      onClick={() => setActiveGame(game.id)}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      whileHover={{ scale: 1.02, y: -5 }}
                      whileTap={{ scale: 0.98 }}
                      className="relative group rounded-2xl glass-panel overflow-hidden p-6 flex flex-col items-start min-h-[160px] transition-all duration-300 hover:border-reaper-glow/40 hover:shadow-glow-green text-left"
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${game.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                      
                      <div className={`p-3 rounded-xl bg-reaper-surface border border-reaper-border/80 mb-4 relative z-10 group-hover:border-reaper-glow/50 transition-colors`}>
                        <game.icon className="w-6 h-6 text-reaper-text group-hover:text-reaper-glow transition-colors" />
                      </div>
                      
                      <h3 className="font-display font-bold text-lg relative z-10 mb-1">{game.name}</h3>
                      <p className="text-sm text-reaper-muted relative z-10">Играть сейчас</p>
                      
                      <div className="absolute bottom-6 right-6 w-8 h-8 rounded-full bg-reaper-surface/50 border border-reaper-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
                        <ChevronRight className="w-4 h-4 text-reaper-glow" />
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
