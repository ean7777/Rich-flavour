import React, { useState, useEffect } from 'react';
import { SmartChatBot } from './components/SmartChatBot';
import { ExcelUploader } from './components/ExcelUploader';
import { Product } from './types';
import { Sparkles, Trash2, RefreshCw } from 'lucide-react';

const App: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('rf_data_simple');
    if (saved) {
      try {
        setProducts(JSON.parse(saved));
      } catch (e) {
        console.error("Local storage parse error", e);
      }
    }
  }, []);

  const handleData = (data: Product[]) => {
    setProducts(data);
    localStorage.setItem('rf_data_simple', JSON.stringify(data));
  };

  const clearDatabase = () => {
    if (confirm("Вы уверены, что хотите удалить все данные?")) {
      setProducts([]);
      localStorage.removeItem('rf_data_simple');
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col shadow-2xl relative overflow-hidden">
      <header className="bg-white border-b p-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-xl font-black tracking-tighter">RICH <span className="text-blue-600">BOT</span></h1>
        </div>
        {products.length > 0 && (
          <button 
            onClick={clearDatabase}
            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
            title="Очистить базу"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </header>

      <main className="flex-1 flex flex-col bg-white overflow-hidden">
        {products.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
              <RefreshCw className="w-10 h-10 text-slate-300" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Прайс не загружен</h2>
            <p className="text-slate-500 text-sm mb-8">Загрузите Excel файл, чтобы бот мог отвечать на вопросы о наличии и ценах.</p>
            <ExcelUploader onDataLoaded={handleData} />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col">
            <SmartChatBot products={products} />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;