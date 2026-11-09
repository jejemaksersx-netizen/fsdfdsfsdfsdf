import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Swords, Dices, Crosshair, Wallet, ChevronRight, Zap, Menu } from 'lucide-react';
import { useLaunchParams } from '@telegram-apps/sdk-react';

const useSafeLaunchParams = () => {
  try {
    const params = useLaunchParams();
    // Достаем данные из разных возможных мест SDK
    const user = (params as any)?.initData?.user || (params as any)?.tgWebAppData?.user;
    return { user };
  } catch (e) {
    return { user: { first_name: 'Player', username: 'player_one' } };
  }
};

const GAMES = [
  { id: 'coin', name: 'Coin Toss', icon: Dices, color: 'from-emerald-500/20 to-teal-500/5' },
  { id: 'dice', name: 'Dice Roll', icon: Crosshair, color: 'from-green-500/20 to-emerald-500/5' },
  { id: 'crash', name: 'Crash', icon: Zap, color: 'from-lime-500/20 to-green-500/5' },
  { id: 'pvp', name: 'PvP Arena', icon: Swords, color: 'from-teal-500/20 to-cyan-500/5' },
];

export default function App() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useSafeLaunchParams();
  
  const userName = user ? `${user.first_name}` : 'Guest';
  const userHandle = user?.username ? `@${user.username}` : '@guest';

  useEffect(() => {
    try {
      // @ts-ignore
      window.Telegram?.WebApp?.expand();
    } catch (e) {}
  }, []);

  return (
    <div className="flex h-screen w-full bg-reaper-bg text-reaper-text font-sans selection:bg-reaper-glow/30 overflow-hidden">
      
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
                  <button key={game.id} className="w-full flex items-center gap-3 p-3 rounded-xl glass-button text-left group">
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
        <div className="h-20 flex items-center px-6 border-b border-reaper-border/50">
          <h2 className="font-display font-bold text-xl tracking-wider text-glow">REAPER</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-2">
          <p className="text-xs uppercase tracking-widest text-reaper-muted mb-4 font-semibold">Меню с играми</p>
          {GAMES.map(game => (
            <button key={game.id} className="w-full flex items-center gap-3 p-3 rounded-xl glass-button text-left group">
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
              <span className="font-mono font-medium text-reaper-gold">0.00</span>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-reaper-green/20 border border-reaper-green/50 hover:bg-reaper-green/30 transition-all text-sm font-medium text-reaper-glow shadow-glow-green">
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">Пополнить</span>
            </button>
          </div>
        </header>

        {/* ОСНОВНОЕ МЕНЮ (ЦЕНТР) */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 lg:p-8 relative">
          <div className="max-w-5xl mx-auto">
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-12 mt-8"
            >
              <h2 className="font-display font-extrabold text-4xl md:text-6xl mb-4 tracking-tight">
                ОСНОВНОЕ <span className="text-reaper-glow text-glow">МЕНЮ</span>
              </h2>
              <p className="text-reaper-muted max-w-md mx-auto">
                Выбери свою игру. Рискни всем. Забери выигрыш.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
              {GAMES.map((game, idx) => (
                <motion.button
                  key={game.id}
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

            {/* Баннер снизу */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-12 rounded-2xl glass-panel p-6 lg:p-8 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-reaper-green/10 to-transparent pointer-events-none" />
              <div className="relative z-10 text-center md:text-left">
                <h3 className="font-display font-bold text-2xl mb-2 text-glow">Готов сорвать куш?</h3>
                <p className="text-reaper-muted">Испытай удачу в самом свежем режиме.</p>
              </div>
              <button className="relative z-10 px-8 py-3 rounded-xl bg-reaper-glow text-reaper-bg font-bold hover:bg-white transition-colors shadow-[0_0_20px_rgba(63,174,122,0.4)]">
                Начать
              </button>
            </motion.div>

          </div>
        </div>
      </main>
    </div>
  );
}
