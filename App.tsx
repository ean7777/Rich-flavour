
import React, { useState, useMemo, useEffect } from 'react';
import { SmartChatBot } from './components/SmartChatBot';
import { ExcelUploader } from './components/ExcelUploader';
import { Product } from './types';
import { Settings, Sparkles, ShieldCheck, Trash2, Database, LayoutDashboard, Lock, KeyRound, X } from 'lucide-react';

const App: React.FC = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [baseProducts, setBaseProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('rf_products');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  
  const [usdRate, setUsdRate] = useState<number>(() => {
    const saved = localStorage.getItem('rf_usdRate');
    return saved ? Number(saved) : 95;
  });
  
  const [fixedMarkup, setFixedMarkup] = useState<number>(() => {
    const saved = localStorage.getItem('rf_fixedMarkup');
    return saved ? Number(saved) : 1500;
  });

  const [adminPassword, setAdminPassword] = useState<string | null>(() => {
    return localStorage.getItem('rf_admin_pass');
  });
  
  const [isBotVisible, setIsBotVisible] = useState(false);
  const [showAdminSettings, setShowAdminSettings] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitializing(false);
      if (baseProducts.length > 0) setIsBotVisible(true);
    }, 800);
    return () => clearTimeout(timer);
  }, [baseProducts]);

  useEffect(() => {
    try {
      localStorage.setItem('rf_usdRate', usdRate.toString());
      localStorage.setItem('rf_fixedMarkup', fixedMarkup.toString());
      // Пробуем сохранить, если файл не слишком большой
      localStorage.setItem('rf_products', JSON.stringify(baseProducts));
    } catch (e) {
      console.warn("Прайс-лист слишком большой для сохранения в браузере. Он будет работать, пока вы не обновите страницу.");
    }
    
    if (baseProducts.length > 0) {
      setIsBotVisible(true);
    }
  }, [usdRate, fixedMarkup, baseProducts]);

  const handleDataLoaded = (data: Product[]) => {
    setBaseProducts(data);
  };

  const handleAdminAccess = () => {
    setShowPasswordModal(true);
  };

  const verifyPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword) {
      if (passwordInput.length < 4) {
        setPasswordError(true);
        return;
      }
      const hashed = btoa(passwordInput);
      localStorage.setItem('rf_admin_pass', hashed);
      setAdminPassword(hashed);
      setShowPasswordModal(false);
      setShowAdminSettings(true);
      setPasswordInput('');
    } else {
      if (btoa(passwordInput) === adminPassword) {
        setShowPasswordModal(false);
        setShowAdminSettings(true);
        setPasswordInput('');
        setPasswordError(false);
      } else {
        setPasswordError(true);
      }
    }
  };

  const resetApp = () => {
    if (window.confirm("Удалить текущий прайс-лист?")) {
      setBaseProducts([]);
      localStorage.removeItem('rf_products');
      setIsBotVisible(false);
      setShowAdminSettings(false);
    }
  };

  const productsWithMarkup = useMemo(() => {
    return baseProducts.map(p => {
      let numericValue = 0;
      if (typeof p.price === 'number') {
        numericValue = p.price;
      } else if (typeof p.price === 'string') {
        numericValue = parseFloat(p.price.replace(/[^0-9.]/g, ''));
      }
      const finalPriceRub = isNaN(numericValue) || numericValue === 0 
        ? 0 
        : Math.round(numericValue * usdRate + fixedMarkup);
      
      return { 
        ...p, 
        price: finalPriceRub > 0 ? `${finalPriceRub.toLocaleString()} ₽` : 'По запросу'
      };
    });
  }, [baseProducts, usdRate, fixedMarkup]);

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <Sparkles className="w-12 h-12 text-[#FF3399] animate-pulse mb-4" />
        <h1 className="text-2xl font-black italic tracking-tighter"><span className="text-[#003399]">Rich</span> <span className="text-[#FF3399]">flavour</span></h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFDFF] text-slate-900 font-sans">
      {showPasswordModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div className="p-3 bg-blue-50 rounded-2xl"><Lock className="w-6 h-6 text-[#003399]" /></div>
              <button onClick={() => setShowPasswordModal(false)} className="p-2 text-slate-400"><X className="w-6 h-6" /></button>
            </div>
            <h3 className="text-xl font-black text-[#003399] mb-2 uppercase tracking-tight">
              {adminPassword ? 'Вход' : 'Задать пароль'}
            </h3>
            <form onSubmit={verifyPassword} className="space-y-4">
              <input 
                autoFocus
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••"
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all"
              />
              {passwordError && <p className="text-red-500 text-[10px] font-bold text-center">ОШИБКА</p>}
              <button type="submit" className="w-full bg-[#003399] text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-[#FF3399] transition-all">
                Войти
              </button>
            </form>
          </div>
        </div>
      )}

      <header className="bg-white border-b border-slate-100 px-4 md:px-6 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="text-xl md:text-2xl font-black italic tracking-tighter">
            <span className="text-[#003399]">Rich</span> <span className="text-[#FF3399]">flavour</span>
          </span>
          {isBotVisible && (
            <button 
              onClick={handleAdminAccess}
              className={`p-2.5 rounded-xl flex items-center gap-2 ${showAdminSettings ? 'bg-[#1E293B] text-white' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              <Settings className="w-5 h-5" />
              <span className="hidden md:inline text-[10px] font-black uppercase tracking-widest">Админ</span>
            </button>
          )}
        </div>

        {isBotVisible && showAdminSettings && (
          <div className="max-w-5xl mx-auto mt-4 p-6 bg-[#1E293B] rounded-[2.5rem] shadow-2xl text-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Курс $</label>
                <input type="number" value={usdRate} onChange={(e) => setUsdRate(Number(e.target.value))} className="w-full bg-transparent border-none text-3xl font-black text-white focus:ring-0 p-0" />
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Наценка ₽</label>
                <input type="number" value={fixedMarkup} onChange={(e) => setFixedMarkup(Number(e.target.value))} className="w-full bg-transparent border-none text-3xl font-black text-white focus:ring-0 p-0" />
              </div>
            </div>
            <button onClick={resetApp} className="mt-6 text-red-400 text-[10px] font-black uppercase flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Удалить данные
            </button>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 flex flex-col items-center">
        {!isBotVisible ? (
          <div className="max-w-2xl w-full text-center py-20">
            <div className="bg-white p-8 rounded-[3rem] shadow-2xl border border-slate-100">
              <h2 className="text-2xl font-black text-[#003399] mb-6 uppercase">Загрузите прайс</h2>
              <ExcelUploader onDataLoaded={handleDataLoaded} />
            </div>
          </div>
        ) : (
          <div className="w-full h-[calc(100vh-160px)] max-w-5xl bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100">
            <SmartChatBot products={productsWithMarkup} />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
