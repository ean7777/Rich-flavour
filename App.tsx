import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Trash2, FileUp, Loader2, CheckCircle2, Send, ShieldCheck, Search, User, Bot } from 'lucide-react';
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

// --- СЕРВИС: ИИ ---
const queryGemini = async (
  prompt: string, 
  products: Product[], 
  history: { role: MessageRole; content: string }[] = []
): Promise<string> => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey || apiKey === "undefined") {
    return "Ошибка конфигурации: API ключ не найден. Проверьте настройки Environment Variables в Netlify (ключ API_KEY).";
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const q = prompt.toLowerCase();
  const matches = products.filter(p => 
    p.brand.toLowerCase().includes(q) || 
    p.name.toLowerCase().includes(q) ||
    q.split(' ').some(word => word.length > 3 && (p.brand.toLowerCase().includes(word) || p.name.toLowerCase().includes(word)))
  ).slice(0, 20);

  const context = matches.length > 0 
    ? matches.map(p => `• БРЕНД: ${p.brand.toUpperCase()} | МОДЕЛЬ: ${p.name} | ЦЕНА: ${p.price}`).join('\n')
    : "В каталоге не найдено точных совпадений для данного запроса.";

  const systemInstruction = `
    Ты — VIP-консьерж элитного парфюмерного дома "RICH FLAVOUR". 
    Твоя задача: предоставлять информацию из прайс-листа.
    
    ДАННЫЕ:
    ${context}
    
    ПРАВИЛА:
    1. Будь предельно вежлив.
    2. Используй только данные выше. Не придумывай цены.
    3. Выделяй названия брендов жирным (**текст**).
    4. Если позиции нет, предложи поискать другой аромат того же бренда.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        ...history.map(h => ({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }]
        })),
        { role: 'user', parts: [{ text: prompt }] }
      ],
      config: { 
        systemInstruction, 
        temperature: 0.1 
      }
    });
    return response.text || "Не удалось получить ответ от ИИ.";
  } catch (err) {
    console.error("AI Error:", err);
    return "Произошла техническая ошибка при связи с ИИ.";
  }
};

// --- КОМПОНЕНТ: ЗАГРУЗКА ---
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

        setSuccess(true);
        setTimeout(() => { onDataLoaded(products); setLoading(false); }, 1000);
      } catch (err) {
        alert("Ошибка чтения Excel");
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <label className={`w-full max-w-[280px] h-32 flex flex-col items-center justify-center border-2 border-dashed rounded-[2rem] cursor-pointer transition-all duration-500 ${success ? 'border-green-500 bg-green-500/10' : 'border-slate-800 bg-slate-900/40 hover:border-[#D4AF37]/50 hover:bg-slate-800/40'}`}>
      {loading ? (
        <Loader2 className="animate-spin text-[#D4AF37] w-8 h-8" />
      ) : success ? (
        <CheckCircle2 className="text-green-500 w-10 h-10 animate-bounce" />
      ) : (
        <>
          <FileUp className="text-slate-600 mb-2" size={24} />
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Загрузить прайс</span>
        </>
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
    content: 'Приветствую. База данных готова. Что вас интересует?', 
    timestamp: new Date() 
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const brands = Array.from(new Set(products.map(p => p.brand))).filter(b => b !== 'N/A').slice(0, 10);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const onSend = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));
    const reply = await queryGemini(text, products, history);
    
    setMessages(prev => [...prev, { 
      id: (Date.now() + 1).toString(), 
      role: 'assistant', 
      content: reply, 
      timestamp: new Date() 
    }]);
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar border-b border-white/5">
        {brands.map(b => (
          <button key={b} onClick={() => onSend(b)} className="px-3 py-1 rounded-full bg-slate-800 border border-white/5 text-[9px] text-slate-400 hover:text-[#D4AF37] uppercase font-bold whitespace-nowrap transition-colors">
            {b}
          </button>
        ))}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar chat-scroll">
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
            <div className={`flex gap-2 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 border ${m.role === 'user' ? 'bg-slate-800 border-white/10' : 'bg-slate-900 border-[#D4AF37]/30'}`}>
                {m.role === 'user' ? <User size={12} className="text-slate-400" /> : <Bot size={12} className="text-[#D4AF37]" />}
              </div>
              <div className={`p-3 rounded-xl text-[12px] leading-relaxed ${m.role === 'user' ? 'bg-slate-800 text-slate-100' : 'bg-slate-900 border border-white/5 text-slate-300'}`}>
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
            </div>
          </div>
        ))}
        {loading && <div className="text-[10px] text-slate-600 font-bold uppercase tracking-widest pl-2">Поиск...</div>}
      </div>

      <div className="p-4 bg-slate-950 border-t border-white/5">
        <form onSubmit={e => { e.preventDefault(); onSend(input); }} className="flex gap-2 bg-slate-800/50 rounded-xl px-3 py-1 items-center border border-white/5 focus-within:border-[#D4AF37]/50 transition-all">
          <input 
            value={input} 
            onChange={e => setInput(e.target.value)} 
            placeholder="Найти аромат..." 
            className="flex-1 bg-transparent py-2 text-sm text-white outline-none placeholder:text-slate-700 font-light"
          />
          <button type="submit" disabled={!input.trim() || loading} className="text-[#D4AF37] disabled:opacity-20">
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

// --- ОСНОВНОЙ КОМПОНЕНТ ---
const App: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('rf_v6');
    if (saved) {
      try { setProducts(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  const handleData = (data: Product[]) => {
    setProducts(data);
    localStorage.setItem('rf_v6', JSON.stringify(data));
  };

  return (
    <div className="w-full max-w-md h-screen sm:h-[700px] bg-slate-950 flex flex-col sm:rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
      <header className="px-6 py-4 border-b border-white/5 flex justify-between items-center">
        <h1 className="text-lg font-bold text-white tracking-tight">RICH <span className="text-[#D4AF37]">FLAVOUR</span></h1>
        {products.length > 0 && (
          <button onClick={() => { setProducts([]); localStorage.removeItem('rf_v6'); }} className="text-slate-600 hover:text-red-400">
            <Trash2 size={16} />
          </button>
        )}
      </header>

      <main className="flex-1 flex flex-col overflow-hidden">
        {products.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <Sparkles className="text-[#D4AF37] mb-4" size={32} />
            <h2 className="text-white mb-6">Загрузите прайс-лист</h2>
            <ExcelUploader onDataLoaded={handleData} />
            <div className="mt-8 text-[8px] text-slate-700 uppercase tracking-widest flex items-center gap-1">
              <ShieldCheck size={10} /> Secure Concierge Engine
            </div>
          </div>
        ) : (
          <ChatInterface products={products} />
        )}
      </main>
    </div>
  );
};

export default App;