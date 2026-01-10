import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Trash2, FileUp, Loader2, CheckCircle2, Send, ShieldCheck, User, Bot, AlertCircle, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import { GoogleGenAI } from "@google/genai";

// --- ТИПЫ ---
interface Product {
  id: string;
  brand: string;
  name: string;
  price: string;
}

type MessageRole = 'user' | 'assistant';

interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
}

// --- КОМПОНЕНТ: ЗАГРУЗКА EXCEL ---
const ExcelUploader: React.FC<{ onDataLoaded: (data: Product[]) => void }> = ({ onDataLoaded }) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        if (!data) throw new Error("File read error");
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json: any[] = XLSX.utils.sheet_to_json(sheet);

        const products: Product[] = json.map((row, i) => {
          const keys = Object.keys(row);
          const bKey = keys.find(k => /бренд|brand/i.test(k)) || keys[0];
          const nKey = keys.find(k => /назв|name|аромат/i.test(k)) || keys[1];
          const pKey = keys.find(k => /цена|price|стоимость/i.test(k)) || keys[2];
          return {
            id: `${i}-${Date.now()}`,
            brand: String(row[bKey] || 'N/A').trim(),
            name: String(row[nKey] || '').trim(),
            price: String(row[pKey] || 'По запросу').trim(),
          };
        });

        if (products.length === 0) throw new Error("Пустой файл");
        
        setSuccess(true);
        setTimeout(() => { onDataLoaded(products); setLoading(false); }, 1000);
      } catch (err) {
        alert("Ошибка чтения Excel. Проверьте формат файла.");
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <label className={`w-full max-w-[300px] h-40 flex flex-col items-center justify-center border-2 border-dashed rounded-[2.5rem] cursor-pointer transition-all duration-500 gold-glow ${success ? 'border-green-500 bg-green-500/10' : 'border-slate-800 bg-slate-900/40 hover:border-[#D4AF37]/50 hover:bg-slate-800/40'}`}>
      {loading ? (
        <Loader2 className="animate-spin text-[#D4AF37] w-10 h-10" />
      ) : success ? (
        <CheckCircle2 className="text-green-500 w-12 h-12" />
      ) : (
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-4">
            <FileUp className="text-[#D4AF37]" size={24} />
          </div>
          <span className="text-[12px] text-slate-400 font-bold uppercase tracking-widest">Загрузить прайс-лист</span>
          <span className="text-[10px] text-slate-600 mt-2 uppercase tracking-tighter">Excel (.xlsx)</span>
        </div>
      )}
      <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleFile} disabled={loading || success} />
    </label>
  );
};

// --- КОМПОНЕНТ: ИНТЕРФЕЙС ЧАТА ---
const ChatInterface: React.FC<{ products: Product[] }> = ({ products }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([{ 
    id: 'welcome', 
    role: 'assistant', 
    content: 'Приветствую. Я изучил ваш прайс-лист. Какой бренд или аромат вас интересует сегодня?', 
    timestamp: new Date() 
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const brands = Array.from(new Set(products.map(p => p.brand))).filter(b => b !== 'N/A' && b.length > 1).slice(0, 15);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const onSend = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey || apiKey === "undefined") {
        throw new Error("API Key Missing");
      }

      const ai = new GoogleGenAI({ apiKey });
      const q = text.toLowerCase();
      
      const matches = products.filter(p => 
        p.brand.toLowerCase().includes(q) || 
        p.name.toLowerCase().includes(q) ||
        q.split(' ').some(word => word.length > 3 && (p.brand.toLowerCase().includes(word) || p.name.toLowerCase().includes(word)))
      ).slice(0, 40);

      const context = matches.length > 0 
        ? matches.map(p => `• БРЕНД: ${p.brand.toUpperCase()} | МОДЕЛЬ: ${p.name} | ЦЕНА: ${p.price}`).join('\n')
        : "В вашем списке товаров по этому запросу ничего не найдено.";

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          ...messages.slice(-6).map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
          })),
          { role: 'user', parts: [{ text: text }] }
        ],
        config: { 
          systemInstruction: `Ты консьерж RICH FLAVOUR. Твоя задача — отвечать на вопросы клиента по его прайс-листу.
          Отвечай кратко, профессионально и вежливо. Используй только предоставленные данные: \n${context}\n
          Если клиент спрашивает цену, найди её в списке. Если бренда/модели нет, предложи посмотреть другие позиции того же бренда.
          Бренды и названия ароматов всегда пиши ЖИРНЫМ шрифтом.`, 
          temperature: 0.1 
        }
      });

      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        content: response.text || "Извините, не удалось найти информацию в вашем прайс-листе.", 
        timestamp: new Date() 
      }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { 
        id: 'error', 
        role: 'assistant', 
        content: 'Произошла ошибка связи с ИИ. Пожалуйста, убедитесь, что API ключ настроен корректно.', 
        timestamp: new Date() 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 overflow-hidden">
      <div className="px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar border-b border-white/5 bg-slate-900/40">
        {brands.map(b => (
          <button key={b} onClick={() => onSend(b)} className="px-4 py-2 rounded-full bg-slate-800/80 border border-white/5 text-[10px] text-slate-300 hover:text-[#D4AF37] hover:border-[#D4AF37]/50 transition-all font-bold whitespace-nowrap uppercase tracking-wider">
            {b}
          </button>
        ))}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-in`}>
            <div className={`flex gap-3 max-w-[88%] ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border ${m.role === 'user' ? 'bg-slate-800 border-white/10' : 'bg-slate-900 border-[#D4AF37]/30'}`}>
                {m.role === 'user' ? <User size={14} className="text-slate-400" /> : <Bot size={14} className="text-[#D4AF37]" />}
              </div>
              <div className={`p-4 rounded-2xl text-[14px] leading-relaxed shadow-lg ${m.role === 'user' ? 'bg-slate-800 text-slate-100 rounded-tr-none' : 'bg-slate-900 border border-white/5 text-slate-300 rounded-tl-none'}`}>
                <div className="whitespace-pre-wrap">{m.content}</div>
                <div className="text-[9px] mt-2 opacity-30 text-right uppercase tracking-widest font-bold">
                  {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-3 animate-pulse pl-2">
            <Loader2 size={16} className="text-[#D4AF37] animate-spin" />
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Поиск в каталоге...</span>
          </div>
        )}
      </div>

      <div className="p-4 bg-slate-950 border-t border-white/5 backdrop-blur-2xl pb-[env(safe-area-inset-bottom)]">
        <form onSubmit={e => { e.preventDefault(); onSend(input); }} className="flex gap-2 bg-slate-800/60 rounded-[1.5rem] px-4 py-1 items-center border border-white/5 focus-within:border-[#D4AF37]/40 transition-all">
          <input 
            value={input} 
            onChange={e => setInput(e.target.value)} 
            placeholder="Найти аромат или бренд..." 
            className="flex-1 bg-transparent py-4 text-[15px] text-white outline-none placeholder:text-slate-700 font-medium"
          />
          <button type="submit" disabled={!input.trim() || loading} className="w-10 h-10 flex items-center justify-center bg-[#D4AF37] text-slate-950 rounded-full hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_rgba(212,175,55,0.3)] disabled:opacity-20">
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

// --- ГЛАВНОЕ ПРИЛОЖЕНИЕ ---
export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('rf_v15');
      if (saved) setProducts(JSON.parse(saved));
    } catch (e) {
      console.error("Storage error");
    }
    setReady(true);
  }, []);

  const handleData = (data: Product[]) => {
    setProducts(data);
    localStorage.setItem('rf_v15', JSON.stringify(data));
  };

  const clearData = () => {
    if (confirm("Вы уверены, что хотите удалить текущую базу данных?")) {
      setProducts([]);
      localStorage.removeItem('rf_v15');
    }
  };

  if (!ready) return null;

  return (
    <div className="flex-1 flex flex-col bg-[#020617] h-screen overflow-hidden">
      <header className="px-6 py-5 pt-[calc(1.25rem+env(safe-area-inset-top))] flex justify-between items-center bg-slate-950/80 border-b border-white/5 z-20">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold tracking-[0.4em] text-[#D4AF37] uppercase opacity-70">Concierge AI</span>
          <h1 className="text-xl font-black tracking-tight text-white leading-none mt-1">
            RICH <span className="text-[#D4AF37]">FLAVOUR</span>
          </h1>
        </div>
        {products.length > 0 && (
          <button onClick={clearData} className="p-2 text-slate-600 hover:text-red-500 transition-colors">
            <Trash2 size={20} />
          </button>
        )}
      </header>

      <main className="flex-1 flex flex-col overflow-hidden">
        {products.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-center animate-slide-in">
            <div className="w-28 h-28 mb-10 relative">
              <div className="absolute inset-0 bg-[#D4AF37]/10 blur-3xl rounded-full animate-pulse"></div>
              <div className="relative flex items-center justify-center w-full h-full border border-[#D4AF37]/20 rounded-full bg-slate-900/40 gold-glow">
                <Sparkles className="text-[#D4AF37]" size={44} />
              </div>
            </div>
            <h2 className="text-2xl font-semibold text-white mb-3">Добро пожаловать</h2>
            <p className="text-slate-500 text-sm mb-12 leading-relaxed max-w-[260px]">Активируйте ИИ-консьержа, загрузив ваш прайс-лист в формате Excel (.xlsx).</p>
            <ExcelUploader onDataLoaded={handleData} />
            <div className="mt-20 flex items-center gap-2 text-[10px] text-slate-700 uppercase tracking-widest font-black">
              <ShieldCheck size={14} className="text-[#D4AF37]/40" />
              Secure Data Engine v2.1
            </div>
          </div>
        ) : (
          <ChatInterface products={products} />
        )}
      </main>
    </div>
  );
}