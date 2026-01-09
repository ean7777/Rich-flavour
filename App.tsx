
import React, { useState, useMemo, useEffect } from 'react';
import { SmartChatBot } from './components/SmartChatBot';
import { ExcelUploader } from './components/ExcelUploader';
import { Product } from './types';
import { Settings, Sparkles, X, Lock, Trash2, RefreshCw } from 'lucide-react';

const App: React.FC = () => {
  const [rawProducts, setRawProducts] = useState<Product[]>([]);
  const [usdRate, setUsdRate] = useState(98);
  const [markup, setMarkup] = useState(1500);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  const [passInput, setPassInput] = useState('');

  useEffect(() => {
    const savedRate = localStorage.getItem('rf_rate');
    const savedMarkup = localStorage.getItem('rf_markup');
    const savedProducts = localStorage.getItem('rf_data');
    if (savedRate) setUsdRate(Number(savedRate));
    if (savedMarkup) setMarkup(Number(savedMarkup));
    if (savedProducts) setRawProducts(JSON.parse(savedProducts));
  }, []);

  const saveSettings = () => {
    localStorage.setItem('rf_rate', usdRate.toString());
    localStorage.setItem('rf_markup', markup.toString());
    setIsAdminOpen(false);
  };

  const handleDataLoaded = (data: Product[]) => {
    setRawProducts(data);
    localStorage.setItem('rf_data', JSON.stringify(data));
  };

  const clearData = () => {
    if (window.confirm("Удалить текущий прайс-лист?")) {
      setRawProducts([]);
      localStorage.removeItem('rf_data');
      setIsAdminOpen(false);
    }
  };

  const verifyPass = (e: React.FormEvent) => {
    e.preventDefault();
    if (passInput === 'rich777') {
      setShowPassModal(false);
      setIsAdminOpen(true);
      setPassInput('');
    } else {
      alert("Неверный пароль");
    }
  };

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
    <div className="max-w-xl mx-auto min-h-screen bg-white md:bg-slate-50 shadow-2xl flex flex-col relative overflow-hidden">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 p-5 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#003399] to-[#FF3399] flex items-center justify-center shadow-lg shadow-blue-100">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black italic tracking-tighter leading-none">
              <span className="text-[#003399]">Rich</span> <span className="text-[#FF3399]">flavour</span>
            </h1>
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mt-1">AI Assistant</p>
          </div>
        </div>
        <button onClick={() => isAdminOpen ? setIsAdminOpen(false) : setShowPassModal(true)} className="p-2 text-slate-300 hover:text-slate-600 transition-colors">
          <Settings className={`w-5 h-5 ${isAdminOpen ? 'rotate-90' : ''} transition-transform`} />
        </button>
      </header>

      {isAdminOpen && (
        <div className="absolute inset-0 z-50 bg-slate-900/98 backdrop-blur-xl p-8 text-white flex flex-col animate-fade-in">
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-xl font-black uppercase tracking-tight text-[#FF3399]">Панель управления</h2>
            <button onClick={() => setIsAdminOpen(false)} className="p-2 bg-white/10 rounded-full"><X className="w-5 h-5" /></button>
          </div>
          
          <div className="space-y-8 flex-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Курс $ (RUB)</label>
                <input type="number" value={usdRate} onChange={(e) => setUsdRate(Number(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-2xl font-black outline-none focus:border-[#003399]" />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Наценка (RUB)</label>
                <input type="number" value={markup} onChange={(e) => setMarkup(Number(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-2xl font-black outline-none focus:border-[#003399]" />
              </div>
            </div>

            <button onClick={saveSettings} className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-[#FF3399] hover:text-white transition-all">
              Применить изменения
            </button>

            <div className="pt-8 border-t border-white/10 space-y-4">
               <button onClick={clearData} className="w-full flex items-center justify-center gap-3 py-4 border border-red-500/30 text-red-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">
                  <Trash2 className="w-4 h-4" /> Удалить текущий прайс
               </button>
            </div>
          </div>
        </div>
      )}

      {showPassModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-6">
          <div className="bg-white p-8 rounded-[2.5rem] w-full max-w-xs shadow-2xl text-center">
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock className="w-5 h-5 text-slate-400" />
            </div>
            <h3 className="font-black uppercase text-xs tracking-widest mb-6">Админ-доступ</h3>
            <form onSubmit={verifyPass}>
              <input type="password" autoFocus placeholder="••••" value={passInput} onChange={(e) => setPassInput(e.target.value)} className="w-full bg-slate-50 rounded-xl px-4 py-4 mb-4 text-center text-xl tracking-[0.5em] outline-none border border-slate-100" />
              <button type="submit" className="w-full py-4 bg-[#003399] text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Войти</button>
              <button type="button" onClick={() => setShowPassModal(false)} className="mt-4 text-[10px] font-bold text-slate-400 uppercase">Закрыть</button>
            </form>
          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col bg-white">
        {processedProducts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
             <div className="relative mb-12">
                <div className="w-24 h-24 bg-blue-50 rounded-[2rem] flex items-center justify-center animate-pulse">
                  <RefreshCw className="w-10 h-10 text-[#003399]" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-[#FF3399] rounded-full flex items-center justify-center text-white shadow-lg">
                  <Sparkles className="w-4 h-4" />
                </div>
             </div>
             <h2 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">Готовы к работе?</h2>
             <p className="text-slate-400 text-sm mb-10 max-w-[240px]">Загрузите ваш прайс-лист в формате Excel для активации ИИ</p>
             <ExcelUploader onDataLoaded={handleDataLoaded} />
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="px-6 py-2 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
               <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">База: {processedProducts.length} поз.</span>
               <span className="text-[9px] font-black uppercase text-green-500 tracking-widest">Бот активен</span>
            </div>
            <SmartChatBot products={processedProducts} />
          </div>
        )}
      </main>

      <footer className="p-4 bg-white text-center">
        <p className="text-[7px] font-black uppercase tracking-[0.5em] text-slate-300">Rich Flavour Intelligent System v2.0</p>
      </footer>
    </div>
  );
};

export default App;
