import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Trash2, FileUp, Loader2, CheckCircle2, Send, ShieldCheck, Search, User, Bot } from 'lucide-react';
import * as XLSX from 'xlsx';
import { GoogleGenAI } from "@google/genai";

// --- ИНТЕРФЕЙСЫ ---
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

// --- СЕРВИС: GEMINI AI ---
const queryGemini = async (
  prompt: string, 
  products: Product[], 
  history: { role: MessageRole; content: string }[] = []
): Promise<string> => {
  // Получаем API ключ из переменных окружения
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === "undefined") {
    return "Системная ошибка: API ключ не настроен. Пожалуйста, установите переменную API_KEY в панели управления Netlify.";
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const q = prompt.toLowerCase();
  // Поиск релевантных товаров (умный фильтр)
  const matches = products.filter(p => 
    p.brand.toLowerCase().includes(q) || 
    p.name.toLowerCase().includes(q) ||
    q.split(' ').some(word => word.length > 3 && (p.brand.toLowerCase().includes(word) || p.name.toLowerCase().includes(word)))
  ).slice(0, 30);

  const context = matches.length > 0 
    ? matches.map(p => `• БРЕНД: ${p.brand.toUpperCase()} | МОДЕЛЬ: ${p.name} | ЦЕНА: ${p.price}`).join('\n')
    : "В каталоге не найдено точных совпадений для данного запроса.";

  const systemInstruction = `
    Ты — VIP-консьерж элитного парфюмерного дома "RICH FLAVOUR". 
    Твоя задача: помогать клиентам находить информацию о товарах и ценах из прайс-листа.
    
    ДАННЫЕ ИЗ ТВОЕГО КАТАЛОГА:
    ${context}
    
    ПРАВИЛА ОБЩЕНИЯ:
    1. Отвечай кратко, профессионально и очень вежливо.
    2. Используй только данные из предоставленного списка. Не придумывай цены.
    3. Если товара нет, предложи ознакомиться с другими позициями того же бренда.
    4. Выделяй названия брендов и ароматов жирным шрифтом (**текст**).
    5. Если цена в списке "По запросу", так и пиши.
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
    return response.text || "Извините, я не смог сформировать ответ. Попробуйте уточнить запрос.";
  } catch (err) {
    console.error("AI Error:", err);
    return "Произошла техническая заминка при обращении к ИИ. Пожалуйста, попробуйте позже.";
  }
};

// --- КОМПОНЕНТ: ЗАГРУЗЧИК ---
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
        alert("Ошибка при чтении файла. Убедитесь, что это Excel (.xlsx)");
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <label className={`w-full max-w-[300px] h-36 flex flex-col items-center justify-center border-2 border-dashed rounded-[2rem] cursor-pointer transition-all duration-500 ${success ? 'border-green-500 bg-green-500/10' : 'border-slate-800 bg-slate-900/40 hover:border-[#D4AF37]/50 hover:bg-slate-800/40'}`}>
      {loading ? (
        <Loader2 className="animate-spin text-[#D4AF37] w-8 h-8" />
      ) : success ? (
        <CheckCircle2 className="text-green-500 w-10 h-10 animate-bounce" />
      ) : (
        <div className="flex flex-col items-center">
          <FileUp className="text-slate-600 mb-3" size={32} />
          <span className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">Загрузить прайс-лист</span>
          <span className="text-[9px] text-slate-700 mt-1 uppercase">Excel (xlsx, xls)</span>
        </div>
      )}
      <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleFile} disabled={loading || success} />
    </label>
  );
};

// --- КОМПОНЕНТ: ЧАТ ---
const ChatInterface: React.FC<{ products: Product[] }> = ({ products }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([{ 
    id: 'welcome', 
    role: 'assistant', 
    content: 'Приветствую. База данных успешно импортирована. Какой бренд или аромат вас интересует сегодня?', 
    timestamp: new Date() 
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Уникальные бренды для быстрых кнопок
  const brands = Array.from(new Set(products.map(p => p.brand))).filter(b => b !== 'N/A').slice(0, 15);

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
    <div className="flex flex-col h-full bg-slate-950/20">
      {/* Быстрые бренды */}
      <div className="px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar border-b border-white/5 bg-slate-900/20">
        {brands.map(b => (
          <button 
            key={b} 
            onClick={() => onSend(b)} 
            className="px-4 py-1.5 rounded-full bg-slate-800/80 border border-white/5 text-[10px] text-slate-400 hover:text-[#D4AF37] hover:border-[#D4AF37]/50 transition-all uppercase font-bold whitespace-nowrap"
          >
            {b}
          </button>
        ))}
      </div>

      {/* Сообщения */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar chat-scroll">
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
            <div className={`flex gap-3 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border ${m.role === 'user' ? 'bg-slate-800 border-white/10' : 'bg-slate-900 border-[#D4AF37]/30'}`}>
                {m.role === 'user' ? <User size={14} className="text-slate-400" /> : <Bot size={14} className="text-[#D4AF37]" />}
              </div>
              <div className={`p-4 rounded-2xl text-[13px] leading-relaxed shadow-xl ${m.role === 'user' ? 'bg-slate-800 text-slate-100 rounded-tr-none' : 'bg-slate-900/90 border border-white/5 text-slate-300 rounded-tl-none'}`}>
                <div className="whitespace-pre-wrap">{m.content}</div>
                <div className="text-[8px] mt-2 opacity-30 text-right uppercase tracking-widest font-bold">
                  {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-3 animate-pulse pl-2">
            <div className="w-8 h-8 rounded-full bg-slate-900 border border-[#D4AF37]/20 flex items-center justify-center">
              <Loader2 size={14} className="text-[#D4AF37] animate-spin" />
            </div>
            <span className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.2em]">Поиск в базе...</span>
          </div>
        )}
      </div>

      {/* Ввод */}
      <div className="p-4 bg-slate-950/80 border-t border-white/5 backdrop-blur-xl">
        <form onSubmit={e => { e.preventDefault(); onSend(input); }} className="flex gap-2 bg-slate-800/50 rounded-2xl px-4 py-1 items-center border border-white/5 focus-within:border-[#D4AF37]/30 transition-all shadow-inner">
          <Search size={18} className="text-slate-600" />
          <input 
            value={input} 
            onChange={e => setInput(e.target.value)} 
            placeholder="Найти аромат или бренд..." 
            className="flex-1 bg-transparent py-3 text-sm text-white outline-none placeholder:text-slate-700 font-light"
          />
          <button 
            type="submit" 
            disabled={!input.trim() || loading} 
            className="w-10 h-10 flex items-center justify-center bg-[#D4AF37] text-slate-950 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_rgba(212,175,55,0.2)] disabled:opacity-20"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

// --- ГЛАВНОЕ ПРИЛОЖЕНИЕ ---
const App: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('rf_inventory_v4');
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setProducts(parsed);
      } catch (e) { 
        console.error("Storage load error"); 
      }
    }
  }, []);

  const handleData = (data: Product[]) => {
    setProducts(data);
    localStorage.setItem('rf_inventory_v4', JSON.stringify(data));
  };

  const clearData = () => {
    if (confirm("Вы уверены, что хотите удалить текущую базу данных?")) {
      setProducts([]);
      localStorage.removeItem('rf_inventory_v4');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#020617] p-0 sm:p-4 w-full">
      <div className="w-full max-w-md h-screen sm:h-[850px] bg-slate-950 flex flex-col shadow-2xl relative sm:rounded-[3rem] overflow-hidden border border-slate-800/50">
        
        {/* Хедер */}
        <header className="px-6 py-5 flex justify-between items-center bg-slate-950/50 backdrop-blur-md border-b border-white/5 z-20">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold tracking-[0.3em] text-[#D4AF37] uppercase">Concierge Service</span>
            <h1 className="text-xl font-extrabold tracking-tighter text-white">
              RICH <span className="text-[#D4AF37]">FLAVOUR</span>
            </h1>
          </div>
          {products.length > 0 && (
            <button onClick={clearData} className="p-2 text-slate-600 hover:text-red-400 transition-colors">
              <Trash2 size={18} />
            </button>
          )}
        </header>

        {/* Основной контент */}
        <main className="flex-1 flex flex-col overflow-hidden bg-gradient-to-b from-slate-950 to-slate-900">
          {products.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
              <div className="w-24 h-24 mb-8 relative">
                <div className="absolute inset-0 bg-[#D4AF37]/10 blur-3xl rounded-full animate-pulse"></div>
                <div className="relative flex items-center justify-center w-full h-full border border-[#D4AF37]/20 rounded-full bg-slate-900/50">
                  <Sparkles className="text-[#D4AF37]" size={40} />
                </div>
              </div>
              <h2 className="text-2xl font-light text-white mb-3">Добро пожаловать</h2>
              <p className="text-slate-500 text-sm mb-12 leading-relaxed max-w-[240px]">Загрузите ваш прайс-лист Excel, чтобы активировать интеллект консьержа.</p>
              
              <ExcelUploader onDataLoaded={handleData} />
              
              <div className="mt-16 flex items-center gap-2 text-[10px] text-slate-600 uppercase tracking-widest font-bold">
                <ShieldCheck size={12} className="text-[#D4AF37]" />
                Secure Engine v1.2
              </div>
            </div>
          ) : (
            <ChatInterface products={products} />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;