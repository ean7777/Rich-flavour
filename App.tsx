import React, { useState, useEffect } from 'react';
import { SmartChatBot } from './components/SmartChatBot';
import { ExcelUploader } from './components/ExcelUploader';
import { Product } from './types';
import { Sparkles, Trash2, ShieldCheck } from 'lucide-react';

const App: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('rich_flavour_inventory');
    if (saved) {
      try {
        setProducts(JSON.parse(saved));
      } catch (e) {
        console.error("Storage error", e);
      }
    }
  }, []);

  const handleData = (data: Product[]) => {
    setProducts(data);
    localStorage.setItem('rich_flavour_inventory', JSON.stringify(data));
  };

  const resetBase = () => {
    if (window.confirm("Удалить текущий прайс-лист?")) {
      setProducts([]);
      localStorage.removeItem('rich_flavour_inventory');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#020617] p-0 sm:p-4">
      <div className="w-full max-w-md h-screen sm:h-[850px] bg-slate-950 flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.8)] relative sm:rounded-[3rem] overflow-hidden border border-slate-800/50">
        
        <header className="px-6 py-5 flex justify-between items-center bg-slate-950/50 backdrop-blur-md border-b border-white/5 z-20">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-[0.3em] text-[#D4AF37] uppercase">Concierge Service</span>
            </div>
            <h1 className="text-xl font-extrabold tracking-tighter text-white">
              RICH <span className="text-[#D4AF37]">FLAVOUR</span>
            </h1>
          </div>
          {products.length > 0 && (
            <button 
              onClick={resetBase}
              className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-500 hover:text-red-400"
              aria-label="Очистить прайс-лист"
            >
              <Trash2 size={18} />
            </button>
          )}
        </header>

        <main className="flex-1 flex flex-col overflow-hidden bg-gradient-to-b from-slate-950 to-slate-900">
          {products.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
              <div className="w-24 h-24 mb-8 relative">
                <div className="absolute inset-0 bg-[#D4AF37]/20 blur-2xl rounded-full animate-pulse"></div>
                <div className="relative flex items-center justify-center w-full h-full border border-[#D4AF37]/30 rounded-full bg-slate-900">
                  <Sparkles className="text-[#D4AF37]" size={40} />
                </div>
              </div>
              <h2 className="text-2xl font-light text-white mb-3">Добро пожаловать</h2>
              <p className="text-slate-400 text-sm mb-10 leading-relaxed font-light">
                Для активации AI-консьержа загрузите актуальный прайс-лист в формате Excel.
              </p>
              <ExcelUploader onDataLoaded={handleData} />
              
              <div className="mt-12 flex items-center gap-2 text-[10px] text-slate-500 uppercase tracking-widest">
                <ShieldCheck size={12} className="text-[#D4AF37]" />
                Secure Concierge Engine
              </div>
            </div>
          ) : (
            <SmartChatBot products={products} />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;