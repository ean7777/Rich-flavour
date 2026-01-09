import React, { useState, useMemo, useEffect } from 'react';
import { SmartChatBot } from './components/SmartChatBot';
import { ExcelUploader } from './components/ExcelUploader';
import { Product } from './types';
import { Settings, Sparkles, X, Lock } from 'lucide-react';

const App: React.FC = () => {
  const [rawProducts, setRawProducts] = useState<Product[]>([]);
  const [usdRate, setUsdRate] = useState(98);
  const [markup, setMarkup] = useState(1500);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  const [passInput, setPassInput] = useState('');

  // Загружаем настройки из localStorage
  useEffect(() => {
    const savedRate = localStorage.getItem('rf_rate');
    const savedMarkup = localStorage.getItem('rf_markup');
    if (savedRate) setUsdRate(Number(savedRate));
    if (savedMarkup) setMarkup(Number(savedMarkup));
  }, []);

  const saveSettings = () => {
    localStorage.setItem('rf_rate', usdRate.toString());
    localStorage.setItem('rf_markup', markup.toString());
    setIsAdminOpen(false);
  };

  const handleAdminAccess = () => {
    if (isAdminOpen) setIsAdminOpen(false);
    else setShowPassModal(true);
  };

  const verifyPass = (e: React.FormEvent) => {
    e.preventDefault();
    if (passInput === 'rich777') { // Простой пароль для примера
      setShowPassModal(false);
      setIsAdminOpen(true);
      setPassInput('');
    } else {
      alert("Неверный пароль");
    }
  };

  // Пересчет цен на лету
  const processedProducts = useMemo(() => {
    return rawProducts.map(p => {
      let basePrice = 0;
      if (typeof p.price === 'number') basePrice = p.price;
      else if (typeof p.price === 'string') basePrice = parseFloat(p.price.replace(/[^0-9.]/g, ''));

      const finalPrice = basePrice > 0 ? Math.round(basePrice * usdRate + markup) : 0;
      return {
        ...p,
        price: finalPrice > 0 ? `${finalPrice.toLocaleString()} ₽` : 'По запросу'
      };
    });
  }, [rawProducts, usdRate, markup]);

  return (
    <div className="max-w-xl mx-auto min-h-screen bg-slate-50 shadow-2xl flex flex-col relative overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 p-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#003399] to-[#FF3399] flex items-center justify-center shadow-lg shadow-blue-200">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-black italic tracking-tighter">
            <span className="text-[#003399]">Rich</span> <span className="text-[#FF3399]">flavour</span>
          </h1>
        </div>
        <button onClick={handleAdminAccess} className="p-2 text-slate-400 hover:text-slate-600">
          <Settings className="w-5 h-5" />
        </button>
      </header>

      {/* Admin Overlay */}
      {isAdminOpen && (
        <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-md p-8 text-white flex flex-col justify-center animate-fade-in">
          <button onClick={() => setIsAdminOpen(false)} className="absolute top-8 right-8"><X /></button>
          <h2 className="text-2xl font-black uppercase mb-8 text-[#FF3399]">Настройки цен</h2>
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Курс доллара ($)</label>
              <input 
                type="number" 
                value={usdRate} 
                onChange={(e) => setUsdRate(Number(e.target.value))}
                className="w-full bg-white/10 border border-white/20 rounded-2xl px-6 py-4 text-2xl font-black focus:border-[#FF3399] outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Фикс. наценка (₽)</label>
              <input 
                type="number" 
                value={markup} 
                onChange={(e) => setMarkup(Number(e.target.value))}
                className="w-full bg-white/10 border border-white/20 rounded-2xl px-6 py-4 text-2xl font-black focus:border-[#FF3399] outline-none"
              />
            </div>
            <button 
              onClick={saveSettings}
              className="w-full bg-[#FF3399] py-5 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl active:scale-95 transition-all"
            >
              Сохранить
            </button>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {showPassModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-[2rem] w-full max-w-xs shadow-2xl">
            <h3 className="text-center font-black uppercase text-sm mb-6">Вход для админа</h3>
            <form onSubmit={verifyPass}>
              <input 
                type="password" 
                autoFocus
                placeholder="Пароль" 
                value={passInput}
                onChange={(e) => setPassInput(e.target.value)}
                className="w-full bg-slate-100 rounded-xl px-4 py-3 mb-4 outline-none focus:ring-2 focus:ring-blue-200"
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowPassModal(false)} className="flex-1 py-3 text-xs font-bold text-slate-400">Отмена</button>
                <button type="submit" className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold">Войти</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="flex-1 flex flex-col">
        {processedProducts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
             <div className="text-center mb-10">
                <h2 className="text-3xl font-black text-[#003399] mb-4">Прайс не загружен</h2>
                <p className="text-slate-400 text-sm">Загрузите Excel файл, чтобы активировать бота</p>
             </div>
             <ExcelUploader onDataLoaded={setRawProducts} />
          </div>
        ) : (
          <div className="flex-1 relative">
            <SmartChatBot products={processedProducts} />
          </div>
        )}
      </main>

      <footer className="p-4 bg-white border-t border-slate-50 text-center">
        <p className="text-[8px] font-black uppercase tracking-[0.4em] text-slate-300">© 2024 Rich Flavour Assistant</p>
      </footer>
    </div>
  );
};

export default App;