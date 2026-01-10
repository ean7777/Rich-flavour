import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Trash2, FileUp, Loader2, CheckCircle2, Send, ShieldCheck, User, Bot } from 'lucide-react';
import * as XLSX from 'xlsx';
import { GoogleGenAI } from "@google/genai";

interface Product {
  id: string;
  brand: string;
  name: string;
  price: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

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
        if (!data) throw new Error("Read error");
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json: any[] = XLSX.utils.sheet_to_json(sheet);

        const products: Product[] = json.map((row, i) => {
          const keys = Object.keys(row);
          const bKey = keys.find(k => /бренд|brand/i.test(k)) || keys[0];
          const nKey = keys.find(k => /назв|name|аромат|модель/i.test(k)) || keys[1];
          const pKey = keys.find(k => /цена|price|стоимость/i.test(k)) || keys[2];
          return {
            id: `${i}-${Date.now()}`,
            brand: String(row[bKey] || 'N/A').trim(),
            name: String(row[nKey] || '').trim(),
            price: String(row[pKey] || 'По запросу').trim(),
          };
        });

        if (products.length === 0) throw new Error("Empty");
        
        setSuccess(true);
        setTimeout(() => { onDataLoaded(products); setLoading(false); }, 1000);
      } catch (err) {
        alert("Ошибка. Проверьте, что в Excel есть колонки Бренд, Название, Цена.");
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <label className={`w-full max-w-[300px] h-48 flex flex-col items-center justify-center border-2 border-dashed rounded-[3rem] cursor-pointer transition-all duration-500 gold-glow ${success ? 'border-green-500 bg-green-500/10' : 'border-slate-800 bg-slate-900/40 hover:border-[#D4AF37]/50 hover:bg-slate-800/40'}`}>
      {loading ? (
        <Loader2 className="animate-spin text-[#D4AF37] w-12 h-12" />
      ) : success ? (
        <CheckCircle2 className="text-green-500 w-14 h-14" />
      ) : (
        <div className="flex flex-col items-center p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
            <FileUp className="text-[#D4AF37]" size={32} />
          </div>
          <span className="text-[14px] text-slate-200 font-bold uppercase tracking-widest">Выбрать файл</span>
          <span className="text-[10px] text-slate-500 mt-2 uppercase tracking-tighter">Прайс-лист .XLSX</span>
        </div>
      )}
      <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleFile} disabled={loading || success} />
    </label>
  );
};

const ChatInterface: React.FC<{ products: Product[] }> = ({ products }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([{ 
    id: 'welcome', 
    role: 'assistant', 
    content: 'Приветствую! Я консьерж RICH FLAVOUR. Задайте вопрос по нашему ассортименту или выберите бренд ниже.', 
    timestamp: new Date() 
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const brands = Array.from(new Set(products.map(p => p.brand)))
    .filter(b => b !== 'N/A' && b.length > 1)
    .sort()
    .slice(0, 20);

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
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const q = text.toLowerCase();
      
      const matches = products.filter(p => 
        p.brand.toLowerCase().includes(q) || 
        p.name.toLowerCase().includes(q)
      ).slice(0, 30);

      const context = matches.length > 0 
        ? matches.map(p => `• ${p.brand.toUpperCase()} | ${p.name} | Цена: ${p.price}`).join('\n')
        : "В предоставленном прайсе товар не найден.";

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          ...messages.slice(-4).map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
          })),
          { role: 'user', parts: [{ text: text }] }
        ],
        config: { 
          systemInstruction: `Ты консьерж RICH FLAVOUR. Твоя роль — помогать клиенту ориентироваться в ценах. 
          Отвечай кратко, стильно и профессионально.
          Данные из прайса: \n${context}\n
          Если данных нет в списке, вежливо сообщи об этом. Бренды выделяй ЖИРНЫМ.`, 
          temperature: 0.1 
        }
      });

      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        content: response.text || "Информацию найти не удалось.", 
        timestamp: new Date() 
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { id: 'err', role: 'assistant', content: 'Проблемы с подключением к ИИ. Попробуйте еще раз.', timestamp: new Date() }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 overflow-hidden">
      <div className="px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar border-b border-white/5 bg-slate-900/40 shrink-0">
        {brands.map(b => (
          <button key={b} onClick={() => onSend(b)} className="px-4 py-2 rounded-full bg-slate-800/80 border border-white/10 text-[10px] text-slate-300 hover:text-[#D4AF37] hover:border-[#D4AF37]/50 transition-all font-bold uppercase tracking-wider whitespace-nowrap">
            {b}
          </button>
        ))}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar pb-10">
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-in`}>
            <div className={`flex gap-3 max-w-[90%] ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`p-4 rounded-2xl text-[15px] leading-relaxed shadow-2xl ${m.role === 'user' ? 'bg-slate-800 text-slate-100 rounded-tr-none' : 'bg-slate-900 border border-white/5 text-slate-300 rounded-tl-none'}`}>
                <div className="whitespace-pre-wrap">{m.content}</div>
                <div className="text-[9px] mt-2 opacity-30 text-right uppercase tracking-[0.2em] font-black">
                  {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </div>
        ))}
        {loading && <div className="text-[10px] text-[#D4AF37] animate-pulse font-bold uppercase tracking-[0.3em] pl-4">Сверяюсь с прайсом...</div>}
      </div>

      <div className="p-4 bg-slate-950/90 border-t border-white/5 backdrop-blur-xl pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <form onSubmit={e => { e.preventDefault(); onSend(input); }} className="flex gap-2 bg-slate-800/40 rounded-full px-5 py-1 items-center border border-white/5 focus-within:border-[#D4AF37]/30 transition-all">
          <input value={input} onChange={e => setInput(e.target.value)} placeholder="Название или бренд..." className="flex-1 bg-transparent py-4 text-[16px] text-white outline-none placeholder:text-slate-700" />
          <button type="submit" disabled={!input.trim() || loading} className="w-10 h-10 flex items-center justify-center bg-[#D4AF37] text-slate-950 rounded-full shadow-[0_0_20px_rgba(212,175,55,0.4)] disabled:opacity-10 active:scale-90 transition-all">
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('rf_v30');
      if (saved) setProducts(JSON.parse(saved));
    } catch (e) {}
    setReady(true);
  }, []);

  if (!ready) return null;

  return (
    <div className="flex-1 flex flex-col bg-[#020617] h-screen overflow-hidden">
      <header className="px-6 py-5 pt-[calc(1.25rem+env(safe-area-inset-top))] flex justify-between items-center bg-slate-950 border-b border-white/5 shrink-0 z-10">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold tracking-[0.4em] text-[#D4AF37] uppercase opacity-70">Concierge AI</span>
          <h1 className="text-xl font-black tracking-tight text-white leading-none mt-1 uppercase">Rich <span className="text-[#D4AF37]">Flavour</span></h1>
        </div>
        {products.length > 0 && (
          <button onClick={() => { if(confirm("Очистить базу данных?")){ setProducts([]); localStorage.removeItem('rf_v30'); } }} className="p-2 text-slate-700 hover:text-red-500 transition-colors">
            <Trash2 size={20} />
          </button>
        )}
      </header>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        {products.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-center animate-slide-in">
            <div className="w-36 h-36 mb-12 relative">
              <div className="absolute inset-0 bg-[#D4AF37]/10 blur-[60px] rounded-full animate-pulse"></div>
              <div className="relative flex items-center justify-center w-full h-full border border-[#D4AF37]/20 rounded-full bg-slate-900/60 gold-glow shadow-2xl">
                <Sparkles className="text-[#D4AF37]" size={56} />
              </div>
            </div>
            <h2 className="text-3xl font-black text-white mb-4 tracking-tight">ВАШ ПРАЙС-ЛИСТ</h2>
            <p className="text-slate-500 text-sm mb-12 max-w-[280px] leading-relaxed">Загрузите Excel файл, чтобы я мог отвечать на вопросы ваших клиентов о наличии и ценах.</p>
            <ExcelUploader onDataLoaded={(d) => { setProducts(d); localStorage.setItem('rf_v30', JSON.stringify(d)); }} />
            <div className="mt-20 flex items-center gap-2 text-[10px] text-slate-800 uppercase tracking-widest font-black">
              <ShieldCheck size={14} className="opacity-20" />
              Intelligence Engine v4.0
            </div>
          </div>
        ) : (
          <ChatInterface products={products} />
        )}
      </main>
    </div>
  );
}