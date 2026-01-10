import React, { useState, useEffect } from 'react';
import { SmartChatBot } from './components/SmartChatBot';
import { ExcelUploader } from './components/ExcelUploader';
import { Product } from './types';
import { Sparkles, RefreshCw } from 'lucide-react';

const App: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('rf_simple_data');
    if (saved) {
      try {
        setProducts(JSON.parse(saved));
      } catch (e) {
        console.error("Data parse error", e);
      }
    }
  }, []);

  const handleData = (data: Product[]) => {
    setProducts(data);
    localStorage.setItem('rf_simple_data', JSON.stringify(data));
  };

  const clearData = () => {
    if (confirm("Удалить все товары?")) {
      setProducts([]);
      localStorage.removeItem('rf_simple_data');
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white flex flex-col shadow-xl font-['Inter']">
      <header className="p-4 border-b flex justify-between items-center bg-white sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h1 className="font-black tracking-tighter text-xl">RICH <span className="text-blue-600">BOT</span></h1>
        </div>
        {products.length > 0 && (
          <button onClick={clearData} className="text-[10px] font-bold uppercase tracking-widest text-red-500 hover:opacity-70">
            Сброс
          </button>
        )}
      </header>

      <main className="flex-1 flex flex-col overflow-hidden">
        {products.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="mb-6 p-6 bg-slate-50 rounded-full">
              <RefreshCw className="w-12 h-12 text-slate-300" />
            </div>
            <h2 className="text-xl font-bold mb-2">Загрузите прайс-лист</h2>
            <p className="text-slate-400 text-sm mb-8">Загрузите Excel файл с колонками Бренд, Название и Цена</p>
            <ExcelUploader onDataLoaded={handleData} />
          </div>
        ) : (
          <SmartChatBot products={products} />
        )}
      </main>
    </div>
  );
};

export default App;