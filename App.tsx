import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Swords, Crosshair, Wallet, ChevronRight, Zap, Menu, Bomb, Shield, X, Coins, TrendingUp, AlertTriangle, Trophy } from 'lucide-react';
import { useLaunchParams } from '@telegram-apps/sdk-react';

const API_URL = "https://reaperbet-backend.onrender.com";

const useSafeLaunchParams = () => {
  try {
    const params = useLaunchParams();
    return { user: (params as any)?.initData?.user || (params as any)?.tgWebAppData?.user };
  } catch (e) {
    return { user: null };
  }
};

const GAMES = [
  { id: 'mines', name: 'Mines', icon: Bomb, color: 'from-red-500/20 to-orange-500/5' },
  { id: 'crash', name: 'Crash', icon: TrendingUp, color: 'from-blue-500/20 to-cyan-500/5' },
  { id: 'slots', name: 'Slots', icon: Coins, color: 'from-yellow-500/20 to-amber-500/5' },
  { id: 'pvp', name: 'PvP Arena', icon: Swords, color: 'from-teal-500/20 to-cyan-500/5' },
];

export default function App() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user: tgUser } = useSafeLaunchParams();
  
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [activeGame, setActiveGame] = useState<string | null>(null);
  
  const [modal, setModal] = useState<{ type: 'win'|'lose'|null, title: string, text: string }>({ type: null, title: '', text: '' });

  const [bet, setBet] = useState(100);

  // MINES STATE
  const [minesCount, setMinesCount] = useState(3);
  const [isPlayingMines, setIsPlayingMines] = useState(false);
  const [grid, setGrid] = useState<('hidden'|'safe'|'mine')[]>(Array(25).fill('hidden'));
  const [currentWin, setCurrentWin] = useState(0);
  const [multiplier, setMultiplier] = useState(1.0);

  // CRASH STATE
  const [isPlayingCrash, setIsPlayingCrash] = useState(false);
  const [crashMultiplier, setCrashMultiplier] = useState(1.0);
  const [crashStatus, setCrashStatus] = useState<'idle'|'playing'|'crashed'>('idle');
  const crashTimer = useRef<any>(null);

  // SLOTS STATE
  const [slotsGrid, setSlotsGrid] = useState<string[][]>([['skull','skull','skull'],['skull','skull','skull'],['skull','skull','skull']]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winLines, setWinLines] = useState<any[]>([]);

  // ADMIN STATE
  const [adminClicks, setAdminClicks] = useState(0);
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminTarget, setAdminTarget] = useState('');
  const [adminAmount, setAdminAmount] = useState('1000');

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
      .catch(err => console.error(err));
    } else {
      setUser({ first_name: 'Test', username: 'test', is_admin: true, id: 7554546588 });
      setBalance(10000);
    }
    
    return () => { if (crashTimer.current) clearInterval(crashTimer.current); };
  }, []);

  const handleLogoClick = () => {
    const newClicks = adminClicks + 1;
    setAdminClicks(newClicks);
    if (newClicks >= 5) {
      if (user?.is_admin || user?.id === 7554546588) {
        setActiveGame(null);
        setShowAdmin(true);
      }
      setAdminClicks(0);
    }
    setTimeout(() => setAdminClicks(0), 2000);
  };

  // --- MINES ---
  const startMines = async () => {
    // @ts-ignore
    const initData = window.Telegram?.WebApp?.initData || "";
    if (!initData) return;
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
      setIsPlayingMines(true);
      setCurrentWin(0);
      setMultiplier(1.0);
    } catch (e: any) {
      setModal({ type: 'lose', title: 'Ошибка', text: e.message });
    }
  };

  const clickCell = async (index: number) => {
    if (!isPlayingMines || grid[index] !== 'hidden') return;
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
        setIsPlayingMines(false);
        setBalance(data.balance);
        setModal({ type: 'lose', title: 'Бум!', text: 'Вы наступили на мину.' });
      } else if (data.status === 'win') {
        newGrid[index] = 'safe';
        setGrid(newGrid);
        setIsPlayingMines(false);
        setBalance(data.balance);
        setModal({ type: 'win', title: 'Победа!', text: `Вы выиграли ${data.amount}!` });
      } else {
        newGrid[index] = 'safe';
        setGrid(newGrid);
        setMultiplier(data.multiplier);
        setCurrentWin(data.current_win);
      }
    } catch (e: any) {
      setModal({ type: 'lose', title: 'Ошибка', text: e.message });
    }
  };

  const cashoutMines = async () => {
    if (!isPlayingMines || currentWin <= 0) return;
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
      setIsPlayingMines(false);
      setModal({ type: 'win', title: 'Забрано!', text: `Вы забрали ${data.amount}` });
    } catch (e: any) {
      setModal({ type: 'lose', title: 'Ошибка', text: e.message });
    }
  };

  // --- CRASH ---
  const startCrash = async () => {
    // @ts-ignore
    const initData = window.Telegram?.WebApp?.initData || "";
    if (!initData) return;
    try {
      const res = await fetch(`${API_URL}/api/game/crash/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, bet })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      
      setBalance(data.balance);
      setIsPlayingCrash(true);
      setCrashStatus('playing');
      setCrashMultiplier(1.0);
      
      let current = 1.0;
      crashTimer.current = setInterval(async () => {
        current += 0.05 + (current * 0.01);
        setCrashMultiplier(current);
        
        const checkRes = await fetch(`${API_URL}/api/game/crash/check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData, current_multiplier: current })
        });
        const checkData = await checkRes.json();
        
        if (checkData.status === 'crashed') {
          clearInterval(crashTimer.current);
          setIsPlayingCrash(false);
          setCrashStatus('crashed');
          setModal({ type: 'lose', title: 'Краш!', text: `Игра упала на ${checkData.crash_point}x` });
        }
      }, 100);
      
    } catch (e: any) {
      setModal({ type: 'lose', title: 'Ошибка', text: e.message });
    }
  };

  const cashoutCrash = async () => {
    if (!isPlayingCrash) return;
    clearInterval(crashTimer.current);
    // @ts-ignore
    const initData = window.Telegram?.WebApp?.initData || "";
    try {
      const res = await fetch(`${API_URL}/api/game/crash/cashout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, current_multiplier: crashMultiplier })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      
      if (data.status === 'crashed') {
        setModal({ type: 'lose', title: 'Не успел!', text: `Игра упала.` });
      } else {
        setBalance(data.balance);
        setModal({ type: 'win', title: 'Забрано!', text: `Вы забрали ${data.amount}` });
      }
      setIsPlayingCrash(false);
      setCrashStatus('idle');
    } catch (e: any) {
      setModal({ type: 'lose', title: 'Ошибка', text: e.message });
    }
  };

  // --- SLOTS ---
  const spinSlots = async () => {
    if (isSpinning) return;
    // @ts-ignore
    const initData = window.Telegram?.WebApp?.initData || "";
    if (!initData) return;
    
    setIsSpinning(true);
    setWinLines([]);
    
    try {
      const res = await fetch(`${API_URL}/api/game/slots/spin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, bet })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      
      setTimeout(() => {
        setSlotsGrid(data.grid);
        setBalance(data.balance);
        setIsSpinning(false);
        setWinLines(data.winning_lines);
        
        if (data.win > 0) {
          setModal({ type: 'win', title: 'Выигрыш!', text: `Вы выиграли ${data.win}!` });
        }
      }, 2000);
      
    } catch (e: any) {
      setIsSpinning(false);
      setModal({ type: 'lose', title: 'Ошибка', text: e.message });
    }
  };

  // --- ADMIN ---
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
      setModal({ type: 'win', title: 'Успех', text: `Выдано! Новый баланс: ${data.new_balance}` });
      setShowAdmin(false);
    } catch (e: any) {
      setModal({ type: 'lose', title: 'Ошибка', text: e.message });
    }
  };

  return (
    <div className="flex h-screen w-full bg-reaper-bg text-reaper-text font-sans overflow-hidden">
      
      <AnimatePresence>
        {modal.type && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setModal({type:null, title:'', text:''})}>
            <motion.div initial={{scale:0.8, y:20}} animate={{scale:1, y:0}} onClick={e => e.stopPropagation()} className={`p-6 rounded-3xl w-full max-w-sm flex flex-col items-center text-center border ${modal.type === 'win' ? 'bg-reaper-surface border-reaper-glow/50 shadow-[0_0_40px_rgba(63,174,122,0.3)]' : 'bg-reaper-surface border-red-500/50 shadow-[0_0_40px_rgba(239,68,68,0.2)]'}`}>
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${modal.type === 'win' ? 'bg-reaper-glow/20 text-reaper-glow' : 'bg-red-500/20 text-red-500'}`}>
                {modal.type === 'win' ? <Trophy size={32}/> : <AlertTriangle size={32}/>}
              </div>
              <h3 className="text-2xl font-bold mb-2">{modal.title}</h3>
              <p className="text-reaper-muted mb-6">{modal.text}</p>
              <button onClick={() => setModal({type:null, title:'', text:''})} className="w-full bg-white/10 hover:bg-white/20 py-3 rounded-xl font-bold transition-colors">
                Закрыть
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                  <label className="text-xs text-reaper-muted uppercase">Telegram ID получателя</label>
                  <input type="number" value={adminTarget} onChange={e=>setAdminTarget(e.target.value)} placeholder="ID друга" className="w-full bg-black/50 border border-reaper-border rounded-lg p-3 mt-1 text-white outline-none focus:border-reaper-glow"/>
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

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 bg-black/60 z-40 lg:hidden" />
            <motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed top-0 left-0 h-full w-72 bg-reaper-surface z-50 flex flex-col p-6 lg:hidden border-r border-reaper-border">
              <div className="flex justify-between items-center mb-8">
                <h2 className="font-display font-bold text-xl tracking-wider text-glow">REAPER</h2>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-black/20 rounded-lg text-reaper-muted"><Menu className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2">
                {GAMES.map(game => (
                  <button key={game.id} onClick={() => {setActiveGame(game.id); setIsMobileMenuOpen(false); setIsPlayingMines(false); setIsPlayingCrash(false);}} className={`w-full flex items-center gap-3 p-3 rounded-xl border border-reaper-border/50 text-left ${activeGame === game.id ? 'bg-reaper-border/40 border-reaper-glow/50' : 'bg-transparent'}`}>
                    <div className={`p-2 rounded-lg bg-reaper-bg`}><game.icon className="w-4 h-4 text-reaper-glow" /></div>
                    <span className="font-medium">{game.name}</span>
                  </button>
                ))}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <aside className="hidden lg:flex w-72 flex-col border-r border-reaper-border bg-reaper-surface z-10 shrink-0">
        <div className="h-20 flex items-center px-6 border-b border-reaper-border cursor-pointer" onClick={handleLogoClick}>
          <h2 className="font-display font-bold text-xl tracking-wider text-glow">REAPER</h2>
        </div>
        <div className="flex-1 p-6 space-y-2">
          {GAMES.map(game => (
            <button key={game.id} onClick={() => {setActiveGame(game.id); setIsPlayingMines(false); setIsPlayingCrash(false);}} className={`w-full flex items-center gap-3 p-3 rounded-xl border border-reaper-border/50 text-left ${activeGame === game.id ? 'bg-reaper-border/40 border-reaper-glow/50' : 'bg-transparent'}`}>
              <div className={`p-2 rounded-lg bg-reaper-bg`}><game.icon className="w-4 h-4 text-reaper-glow" /></div>
              <span className="font-medium">{game.name}</span>
            </button>
          ))}
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 relative">
        <header className="h-20 flex items-center justify-between px-4 lg:px-8 border-b border-reaper-border bg-reaper-bg z-10 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 bg-reaper-surface rounded-lg text-reaper-muted border border-reaper-border">
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden lg:flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-reaper-surface border border-reaper-border flex items-center justify-center">
                <Crosshair className="w-6 h-6 text-reaper-glow" />
              </div>
              <div>
                <h1 className="font-display font-bold text-lg leading-tight tracking-wide">ReaperBet</h1>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-reaper-surface border border-reaper-border">
              <Wallet className="w-4 h-4 text-reaper-gold" />
              <span className="font-mono font-bold text-reaper-gold">{balance}</span>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-reaper-glow/20 border border-reaper-glow/50 transition-all text-sm font-bold text-reaper-glow">
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">Пополнить</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8 relative">
          <AnimatePresence mode="wait">
            {activeGame === 'mines' ? (
              <motion.div key="mines" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0}} className="max-w-md mx-auto pb-20">
                <button onClick={() => {setActiveGame(null); setIsPlayingMines(false);}} className="text-sm text-reaper-muted hover:text-white mb-4 flex items-center gap-2">
                  <ChevronRight className="rotate-180 w-4 h-4"/> Назад
                </button>
                
                <div className="bg-reaper-surface border border-reaper-border rounded-2xl p-5 mb-4 relative">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-display text-2xl font-bold">Mines</h2>
                    {isPlayingMines && (
                      <button onClick={cashoutMines} className="bg-reaper-glow text-black px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-1">
                        <Coins size={16}/> Забрать {currentWin}
                      </button>
                    )}
                  </div>
                  
                  {!isPlayingMines ? (
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs text-reaper-muted uppercase mb-1 block">Ставка</label>
                        <input type="number" value={bet} onChange={e=>setBet(Number(e.target.value))} className="w-full bg-black/50 border border-reaper-border rounded-lg p-3 text-white outline-none font-mono"/>
                      </div>
                      <div>
                        <label className="text-xs text-reaper-muted uppercase mb-1 block">Мин на поле</label>
                        <div className="flex gap-2">
                          {[3, 5, 8, 15, 24].map(m => (
                            <button key={m} onClick={() => setMinesCount(m)} className={`flex-1 py-2 rounded-lg border font-bold text-sm transition-colors ${minesCount === m ? 'bg-reaper-glow border-reaper-glow text-black' : 'bg-black/40 border-reaper-border text-reaper-muted'}`}>
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>
                      <button onClick={startMines} className="w-full bg-reaper-glow text-black font-bold py-3 rounded-xl hover:opacity-90">
                        Начать
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="grid grid-cols-5 gap-1.5 sm:gap-2 mt-2">
                        {grid.map((cell, i) => (
                          <button key={i} onClick={() => clickCell(i)} className={`aspect-square rounded-lg flex items-center justify-center transition-all ${cell === 'hidden' ? 'bg-reaper-bg border border-reaper-border' : ''} ${cell === 'safe' ? 'bg-reaper-glow text-black' : ''} ${cell === 'mine' ? 'bg-red-500/20 border border-red-500 text-red-500' : ''}`}>
                            {cell === 'safe' && <Shield size={20} />}
                            {cell === 'mine' && <Bomb size={20} />}
                          </button>
                        ))}
                      </div>
                      <div className="mt-4 text-center text-sm text-reaper-muted">
                        Коэффициент: <span className="text-reaper-glow font-bold">{multiplier.toFixed(2)}x</span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : activeGame === 'crash' ? (
              <motion.div key="crash" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0}} className="max-w-md mx-auto pb-20">
                <button onClick={() => {setActiveGame(null); setIsPlayingCrash(false); setCrashStatus('idle');}} className="text-sm text-reaper-muted hover:text-white mb-4 flex items-center gap-2">
                  <ChevronRight className="rotate-180 w-4 h-4"/> Назад
                </button>
                
                <div className="bg-reaper-surface border border-reaper-border rounded-2xl p-5 mb-4 flex flex-col items-center">
                  <h2 className="font-display text-2xl font-bold mb-4 w-full text-left">Crash</h2>
                  
                  <div className="w-full h-48 bg-black/40 rounded-xl border border-reaper-border flex items-center justify-center relative overflow-hidden mb-4">
                    {isPlayingCrash ? (
                      <motion.div className="text-5xl font-black text-reaper-glow" animate={{scale: [1, 1.05, 1]}} transition={{repeat: Infinity, duration: 1}}>
                        {crashMultiplier.toFixed(2)}x
                      </motion.div>
                    ) : crashStatus === 'crashed' ? (
                      <div className="text-5xl font-black text-red-500">CRASH</div>
                    ) : (
                      <div className="text-reaper-muted font-medium">Готовы?</div>
                    )}
                  </div>
                  
                  {!isPlayingCrash ? (
                    <div className="w-full space-y-4">
                      <div>
                        <label className="text-xs text-reaper-muted uppercase mb-1 block">Ставка</label>
                        <input type="number" value={bet} onChange={e=>setBet(Number(e.target.value))} className="w-full bg-black/50 border border-reaper-border rounded-lg p-3 text-white outline-none font-mono"/>
                      </div>
                      <button onClick={startCrash} className="w-full bg-reaper-glow text-black font-bold py-3 rounded-xl hover:opacity-90">
                        Начать полет
                      </button>
                    </div>
                  ) : (
                    <button onClick={cashoutCrash} className="w-full bg-reaper-glow text-black font-bold py-4 rounded-xl text-lg shadow-[0_0_20px_rgba(63,174,122,0.4)]">
                      Забрать {(bet * crashMultiplier).toFixed(0)}
                    </button>
                  )}
                </div>
              </motion.div>
            ) : activeGame === 'slots' ? (
              <motion.div key="slots" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0}} className="max-w-md mx-auto pb-20">
                <button onClick={() => {setActiveGame(null); setIsSpinning(false);}} className="text-sm text-reaper-muted hover:text-white mb-4 flex items-center gap-2">
                  <ChevronRight className="rotate-180 w-4 h-4"/> Назад
                </button>
                
                <div className="bg-reaper-surface border border-reaper-border rounded-2xl p-4 sm:p-5 mb-4 relative overflow-hidden">
                  <h2 className="font-display text-2xl font-bold mb-4">Reaper Slots</h2>
                  
                  <div className="flex justify-center gap-2 mb-6 bg-black/60 p-3 rounded-xl border border-reaper-border/50 shadow-inner">
                    {slotsGrid.map((col, colIndex) => (
                      <div key={colIndex} className="flex flex-col gap-2 relative">
                        {col.map((sym, rowIndex) => {
                          const flatIndex = colIndex * 3 + rowIndex;
                          const isWin = winLines.some(l => {
                            if (l.line_index === 0 && [0,1,2].includes(flatIndex)) return true;
                            if (l.line_index === 1 && [3,4,5].includes(flatIndex)) return true;
                            if (l.line_index === 2 && [6,7,8].includes(flatIndex)) return true;
                            return false;
                          });

                          return (
                            <motion.div 
                              key={rowIndex}
                              animate={isSpinning ? { y: [-20, 20, -20, 0], transition: { duration: 0.2, repeat: Infinity } } : {}}
                              className={`w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded-lg border-2 transition-colors ${isWin ? 'border-reaper-gold bg-reaper-gold/20 shadow-[0_0_15px_rgba(201,165,75,0.5)]' : 'border-reaper-border bg-reaper-bg'}`}
                            >
                              {sym === 'skull' && <Bomb className="w-8 h-8 text-white/80" />}
                              {sym === 'scythe' && <Crosshair className="w-8 h-8 text-red-400" />}
                              {sym === 'potion' && <Shield className="w-8 h-8 text-blue-400" />}
                              {sym === 'eye' && <User className="w-8 h-8 text-purple-400" />}
                              {sym === 'coin' && <Coins className="w-8 h-8 text-reaper-gold" />}
                              {sym === 'wild' && <Zap className="w-8 h-8 text-green-400" />}
                            </motion.div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-reaper-muted uppercase mb-1 block">Ставка</label>
                      <input type="number" value={bet} onChange={e=>setBet(Number(e.target.value))} className="w-full bg-black/50 border border-reaper-border rounded-lg p-3 text-white outline-none font-mono"/>
                    </div>
                    <button 
                      onClick={spinSlots} 
                      disabled={isSpinning}
                      className={`w-full font-bold py-4 rounded-xl text-lg transition-all ${isSpinning ? 'bg-reaper-border text-reaper-muted cursor-not-allowed' : 'bg-reaper-glow text-black hover:scale-[1.02]'}`}
                    >
                      {isSpinning ? 'Крутим...' : 'Спин'}
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="menu" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="max-w-4xl mx-auto">
                <div className="text-center mb-10 mt-4">
                  <h2 className="font-display font-extrabold text-4xl md:text-5xl mb-2">
                    ОСНОВНОЕ <span className="text-reaper-glow">МЕНЮ</span>
                  </h2>
                  <p className="text-reaper-muted">Выбери свою игру.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {GAMES.map((game) => (
                    <button
                      key={game.id}
                      onClick={() => setActiveGame(game.id)}
                      className="bg-reaper-surface border border-reaper-border rounded-2xl p-6 flex flex-col items-start hover:border-reaper-glow/50 transition-colors"
                    >
                      <div className={`p-3 rounded-xl bg-reaper-bg mb-4`}>
                        <game.icon className="w-6 h-6 text-reaper-glow" />
                      </div>
                      <h3 className="font-display font-bold text-lg mb-1">{game.name}</h3>
                      <p className="text-sm text-reaper-muted">Играть</p>
                    </button>
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
