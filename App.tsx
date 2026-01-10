import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Trash2, ShieldCheck, FileUp, Loader2, CheckCircle2, Send, User, Bot, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import { GoogleGenAI } from "@google/genai";

// --- TYPES ---
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

// --- AI SERVICE ---
const getRelevantContext = (query: string, products: Product[]): string => {
  const q = query.toLowerCase();
  const matches = products.filter(p => 
    p.brand.toLowerCase().includes(q) || 
    p.name.toLowerCase().includes(q) ||
    q.split(' ').some(word => word.length > 2 && (p.brand.toLowerCase().includes(word) || p.name.toLowerCase().includes(word)))
  ).slice(0, 25);

  if (matches.length === 0) return "В каталоге не найдено точных совпадений.";
  return matches.map(p => `• ${p.brand.toUpperCase()} | ${p.name} | Цена: ${p.price}`).join('\n');
};

const queryGemini = async (
  prompt: string, 
  products: Product[], 
  history: { role: MessageRole; content: string }[] = []
): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return "Ошибка: API_KEY не настроен в переменных окружения.";

  const ai = new GoogleGenAI({ apiKey });
  const context = getRelevantContext(prompt, products);
  
  const systemInstruction = `
    Ты — VIP-консьерж парфюмерного бутика "RICH FLAVOUR". 
    Твой стиль: безупречная вежливость, профессионализм, краткость.
    
    ДАННЫЕ ПРАЙС-ЛИСТА:
    ${context}
    
    ИНСТРУКЦИИ:
    1. Отвечай только по делу, используя данные выше.
    2. Если товара нет, предложи посмотреть другие позиции бренда.
    3. Выделяй названия жирным шрифтом.
    4. Не придумывай цены.
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
      config: { systemInstruction, temperature: 0.2 }
    });
    return response.text || "Не удалось получить ответ от AI.";
  } catch (err) {
    console.error(err);
    return "Техническая ошибка. Пожалуйста, попробуйте позже.";
  }
};

// --- COMPONENTS ---
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
          const k = Object.keys(row);
          const brand = k.find(x => /бренд|brand/i.test(x)) || k[0];
          const name = k.find(x => /назв|name|аромат/i.test(x)) || k[1];
          const price = k.find(x => /цена|price|стоимость/i.test(x)) || k[2];
          return {
            id: `${i}-${Date.now()}`,
            brand: String(row[brand] || 'N/A').trim(),
            name: String(row[name] || '').trim(),
            price: String(row[price] || 'По запросу').trim(),
          };
        });

        setSuccess(true);
        setTimeout(() => { onDataLoaded(products); setLoading(false); }, 800);
      } catch (err) {
        alert("Ошибка формата файла");
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="w-full max-w-[280px]">
      <label className={`group relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-3xl transition-all ${success ? 'border-green-500 bg-green-500/10' : 'border-slate-800 bg-slate-900/40 hover:border-[#D4AF37]/40 hover:bg-slate-800/40'} cursor-pointer`}>
        {loading ? <Loader2 className="animate-spin text-[#D4AF37]" /> : success ? <CheckCircle2 className="text-green-500" /> : (
          <><FileUp className="text-slate-600 mb-2" /><span className="text-[11px] font-semibold text-slate-500 uppercase">Загрузить прайс</span></>
        )}
        <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleFile} disabled={loading || success} />
      </label>
    </div>
  );
};

const SmartChatBot: React.FC<{ products: Product[] }> = ({ products }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: '0', role: 'assistant', content: 'Добрый день. База загружена. Чем я могу вам помочь?', timestamp: new Date() }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, loading]);

  const handleSend = async (text: string) => {
    if (!text.trim() || loading) return;
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date() }]);
    setInput('');
    setLoading(true);
    try {
      const history = messages.slice(-5).map(m => ({ role: m.role, content: m.content }));
      const response = await queryGemini(text, products, history);
      setMessages(prev => [...prev, { id: (Date.now()+1).toString(), role: 'assistant', content: response, timestamp: new Date() }]);
    } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar chat-scroll" ref={scrollRef}>
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
            <div className={`p-4 rounded-2xl text-sm max-w-[85%] ${m.role === 'user' ? 'bg-slate-800 text-white rounded-tr-none' : 'bg-slate-900/80 border border-white/5 text-slate-300 rounded-tl-none'}`}>
              <div className="whitespace-pre-wrap">{m.content}</div>
            </div>
          </div>
        ))}
        {loading && <div className="text-[10px] text-slate-500 uppercase tracking-widest pl-2">Поиск в базе...</div>}
      </div>
      <div className="p-4 bg-slate-950/80 border-t border-white/5">
        <form onSubmit={e => { e.preventDefault(); handleSend(input); }} className="flex gap-2 bg-slate-800/50 rounded-2xl px-4 py-1 items-center">
          <input value={input} onChange={e => setInput(e.target.value)} placeholder="Название или бренд..." className="flex-1 bg-transparent py-3 text-sm text-white outline-none" />
          <button type="submit" disabled={!input.trim() || loading} className="w-10 h-10 flex items-center justify-center bg-[#D4AF37] text-slate-950 rounded-xl disabled:opacity-30"><Send size={18} /></button>
        </form>
      </div>
    </div>
  );
};

// --- MAIN APP ---
const App: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('rf_inv');
    if (saved) try { setProducts(JSON.parse(saved)); } catch(e) {}
  }, []);

  const handleData = (data: Product[]) => {
    setProducts(data);
    localStorage.setItem('rf_inv', JSON.stringify(data));
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#020617] p-0 sm:p-4">
      <div className="w-full max-w-md h-screen sm:h-[800px] bg-slate-950 flex flex-col shadow-2xl relative sm:rounded-[2.5rem] overflow-hidden border border-slate-800/50">
        <header className="px-6 py-5 flex justify-between items-center border-b border-white/5">
          <h1 className="text-xl font-bold text-white">RICH <span className="text-[#D4AF37]">FLAVOUR</span></h1>
          {products.length > 0 && <button onClick={() => { setProducts([]); localStorage.removeItem('rf_inv'); }} className="text-slate-500 hover:text-red-400"><Trash2 size={18} /></button>}
        </header>
        <main className="flex-1 overflow-hidden">
          {products.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
              <Sparkles className="text-[#D4AF37] mb-6" size={48} />
              <h2 className="text-xl text-white mb-2">Активация AI-Консьержа</h2>
              <p className="text-slate-500 text-sm mb-8">Загрузите Excel-файл с вашим прайсом</p>
              <ExcelUploader onDataLoaded={handleData} />
            </div>
          ) : <SmartChatBot products={products} />}
        </main>
      </div>
    </div>
  );
};

export default App;