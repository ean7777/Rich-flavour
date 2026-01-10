
import React, { useState, useMemo, useEffect } from 'react';
import { SmartChatBot } from './components/SmartChatBot';
import { ExcelUploader } from './components/ExcelUploader';
import { Product } from './types';
import { Settings, Sparkles, X, Lock, Trash2, RefreshCw, Phone } from 'lucide-react';

const App: React.FC = () => {
  const [rawProducts, setRawProducts] = useState<Product[]>([]);
  const [usdRate, setUsdRate] = useState(98);
  const [markup, setMarkup] = useState(1500);
  const [waNumber, setWaNumber] = useState('79000000000');
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  const [passInput, setPassInput] = useState('');

  useEffect(() => {
    const savedRate = localStorage.getItem('rf_rate');
    const savedMarkup = localStorage.getItem('rf_markup');
    const savedWa = localStorage.getItem('rf_wa');
    const savedProducts = localStorage.getItem('rf_data');
    if (savedRate) setUsdRate(Number(savedRate));
    if (savedMarkup) setMarkup(Number(savedMarkup));
    if (savedWa) setWaNumber(savedWa);
    if (savedProducts) {
      try {
        setRawProducts(JSON.parse(savedProducts));
      } catch (e) {
        console.error("Failed to parse stored products", e);
      }
    }
  }, []);

  const saveSettings = () => {
    localStorage.setItem('rf_rate', usdRate.toString());
    localStorage.setItem('rf_markup', markup.toString());
    localStorage.setItem('rf_wa', waNumber);
    setIsAdminOpen(false);
  };

  const processedProducts = useMemo(() => {
    return rawProducts.map(p => {
      let basePrice = 0;
      if (typeof p.price === 'number') basePrice = p.price;
      else if (typeof p.price === 'string') basePrice = parseFloat(p.price.replace(/[^0-9.]/g, ''));
      const finalPrice = basePrice > 0 ? Math.round(basePrice * usdRate + markup) : 0;
      return { ...p, price: finalPrice > 0 ? `${finalPrice.toLocaleString()} ₽` : 'По запросу' };
    });
  }, [rawProducts, usdRate, markup]);

  return (
    <div className="max-w-xl mx-auto min-h-screen bg-slate-50 md:shadow-2xl flex flex-col relative overflow-hidden font-['Inter']">
      <header className="bg-white/70 backdrop-blur-xl border-b border-slate-200/50 p-5 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#003399] to-[#FF3399] flex items-center justify-center shadow-lg shadow-blue-200">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black italic tracking-tighter leading-none flex items-center gap-1">
              <span className="text-[#003399]">Rich</span>
              <span className="text-[#FF3399]">flavour</span>
            </h1>
            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">Intelligent Butler</p>
          </div>
        </div>
        <button onClick={() => isAdminOpen ? setIsAdminOpen(false) : setShowPassModal(true)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors text-slate-400">
          <Settings className={`w-5 h-5 ${isAdminOpen ? 'rotate-90 text-[#FF3399]' : ''} transition-all duration-500`} />
        </button>
      </header>

      {isAdminOpen && (
        <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-2xl p-8 text-white flex flex-col animate-fade-in">
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-xl font-black uppercase tracking-widest text-[#FF3399]">Settings</h2>
            <button onClick={() => setIsAdminOpen(false)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"><X className="w-5 h-5" /></button>
          </div>
          <div className="space-y-6 flex-1 overflow-y-auto no-scrollbar">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Курс $</label>
                <input type="number" value={usdRate} onChange={(e) => setUsdRate(Number(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xl font-black outline-none focus:border-[#003399] transition-all" />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Наценка</label>
                <input type="number" value={markup} onChange={(e) => setMarkup(Number(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xl font-black outline-none focus:border-[#003399] transition-all" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><Phone className="w-3 h-3" /> Номер WhatsApp</label>
              <input type="text" value={waNumber} onChange={(e) => setWaNumber(e.target.value)} placeholder="79000000000" className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xl font-black outline-none focus:border-[#003399] transition-all" />
            </div>
            <button onClick={saveSettings} className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-[#FF3399] hover:text-white transition-all shadow-xl shadow-white/5 active:scale-95">
              Save Config
            </button>
            <div className="pt-8 border-t border-white/10">
               <button onClick={() => { if(window.confirm("Удалить базу?")) { setRawProducts([]); localStorage.removeItem('rf_data'); setIsAdminOpen(false); } }} className="w-full flex items-center justify-center gap-3 py-4 border border-red-500/30 text-red-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">
                  <Trash2 className="w-4 h-4" /> Clear Database
               </button>
            </div>
          </div>
        </div>
      )}

      {showPassModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
          <div className="bg-white p-8 rounded-[2.5rem] w-full max-w-xs shadow-2xl text-center scale-up-center">
            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
              <Lock className="w-6 h-6 text-slate-300" />
            </div>
            <h3 className="font-black uppercase text-[10px] tracking-[0.3em] mb-6 text-slate-400">Admin Access</h3>
            <form onSubmit={(e) => { e.preventDefault(); if (passInput === 'rich777') { setShowPassModal(false); setIsAdminOpen(true); setPassInput(''); } else alert("Wrong Pass"); }}>
              <input type="password" autoFocus placeholder="••••" value={passInput} onChange={(e) => setPassInput(e.target.value)} className="w-full bg-slate-50 rounded-2xl px-4 py-5 mb-4 text-center text-2xl tracking-[0.4em] outline-none border border-slate-100 focus:border-blue-200 transition-all" />
              <button type="submit" className="w-full py-5 bg-[#003399] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-[#FF3399] transition-all">Unlock</button>
              <button type="button" onClick={() => setShowPassModal(false)} className="mt-6 text-[9px] font-black text-slate-300 uppercase tracking-widest hover:text-slate-500 transition-colors">Cancel</button>
            </form>
          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col bg-white overflow-hidden relative">
        {processedProducts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center animate-fade-in">
             <div className="relative mb-14 group">
                <div className="absolute inset-0 bg-[#003399]/10 blur-3xl group-hover:bg-[#FF3399]/10 transition-all duration-1000"></div>
                <div className="relative w-28 h-28 bg-white rounded-[2.5rem] flex items-center justify-center shadow-2xl border border-slate-50 animate-bounce-slow">
                  <RefreshCw className="w-12 h-12 text-[#003399]" />
                </div>
                <div className="absolute -top-3 -right-3 w-10 h-10 bg-gradient-to-tr from-[#FF3399] to-pink-400 rounded-full flex items-center justify-center text-white shadow-xl shadow-pink-200">
                  <Sparkles className="w-5 h-5" />
                </div>
             </div>
             <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tighter">Ready to Start?</h2>
             <p className="text-slate-400 text-sm mb-12 max-w-[260px] leading-relaxed">Upload your fragrance price list to activate the AI butler</p>
             <ExcelUploader onDataLoaded={(data: Product[]) => { setRawProducts(data); localStorage.setItem('rf_data', JSON.stringify(data)); }} />
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <SmartChatBot products={processedProducts} waNumber={waNumber} />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
