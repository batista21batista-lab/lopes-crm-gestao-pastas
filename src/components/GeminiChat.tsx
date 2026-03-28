import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Client } from '../types';
import { MessageSquare, Send, X, Bot, User, Loader2, Sparkles, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import Markdown from 'react-markdown';

interface Props {
  onClose: () => void;
  clients: Client[];
}

interface Message {
  role: 'user' | 'model';
  text: string;
}

export default function GeminiChat({ onClose, clients }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Olá! Sou seu assistente virtual da Lopes Consultoria. Como posso ajudar você hoje com a análise de documentos ou gestão de pastas?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = "gemini-3-flash-preview";
      
      const systemInstruction = `
        Você é um especialista sênior em consultoria imobiliária e análise de documentos da Lopes Consultoria de Imóveis.
        Seu objetivo é auxiliar a equipe interna na gestão de pastas de clientes, análise de crédito e conformidade com a LGPD.
        
        Contexto Atual:
        - Existem ${clients.length} clientes cadastrados no sistema.
        - Status das pastas: ${clients.map(c => `${c.name} (${c.status})`).join(', ')}.
        
        Diretrizes:
        1. Responda de forma profissional, prestativa e técnica.
        2. Use o tom de voz da Lopes Consultoria (focado em resultados e excelência).
        3. Se perguntado sobre LGPD, enfatize a proteção de dados sensíveis e o descarte correto de documentos.
        4. Se perguntado sobre documentos, consulte as regras de segmentos (Popular, Médio, Alto Padrão).
        5. Não invente dados de clientes que não estão no contexto.
        6. Formate suas respostas com Markdown para melhor legibilidade.
      `;

      const chat = ai.chats.create({
        model,
        config: { systemInstruction },
        history: messages.map(m => ({ role: m.role, parts: [{ text: m.text }] }))
      });

      const result = await chat.sendMessage({ message: userMessage });
      const responseText = result.text;

      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: 'Desculpe, tive um problema ao processar sua solicitação. Por favor, tente novamente.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ x: 400 }}
      animate={{ x: 0 }}
      exit={{ x: 400 }}
      className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200"
    >
      {/* Header */}
      <div className="h-16 bg-[#ec1847] text-white flex items-center justify-between px-6 shadow-md">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-white/20 rounded-full flex items-center justify-center">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold">Assistente Lopes</h3>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
              <span className="text-[10px] font-medium opacity-80 uppercase tracking-widest">Online</span>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50">
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-700 text-xs mb-4">
          <Info className="h-4 w-4 shrink-0" />
          <p>Este assistente tem acesso ao status das pastas atuais para ajudar na sua análise.</p>
        </div>

        {messages.map((m, i) => (
          <div key={i} className={cn("flex flex-col", m.role === 'user' ? "items-end" : "items-start")}>
            <div className={cn(
              "max-w-[85%] p-4 rounded-2xl text-sm shadow-sm",
              m.role === 'user' 
                ? "bg-[#ec1847] text-white rounded-tr-none" 
                : "bg-white text-gray-800 border border-gray-100 rounded-tl-none"
            )}>
              <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-gray-900 prose-pre:text-gray-100">
                <Markdown>{m.text}</Markdown>
              </div>
            </div>
            <span className="text-[10px] text-gray-400 mt-1 px-1 uppercase font-bold tracking-widest">
              {m.role === 'user' ? 'Você' : 'Assistente Lopes'}
            </span>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin text-red-500" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-6 bg-white border-t border-gray-100">
        <div className="relative flex items-center">
          <input 
            type="text" 
            placeholder="Pergunte algo sobre as pastas ou LGPD..." 
            className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 p-2 bg-[#ec1847] text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-all shadow-md shadow-red-500/20"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 flex items-center justify-center gap-1.5">
          <Sparkles className="h-3 w-3 text-amber-500" />
          <span className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">Powered by Gemini AI</span>
        </div>
      </div>
    </motion.div>
  );
}
