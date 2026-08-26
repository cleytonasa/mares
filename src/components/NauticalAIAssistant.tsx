import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Sparkles, Trash2, ArrowRight, Waves, Ship, Wind, Clock, HelpCircle, ChevronDown, Check } from 'lucide-react';
import { PortConfig, WeatherData } from '../types/maritime';
import { CurrentTideState } from '../utils/tideCalculations';
import { ChatMessage, processNauticalQuery } from '../services/aiNauticalService';

interface NauticalAIAssistantProps {
  port: PortConfig;
  currentTime: Date;
  tideState: CurrentTideState;
  weather: WeatherData | null;
}

const QUICK_SUGGESTIONS = [
  { label: '🚢 Próximos navios previstos', query: 'Qual a previsão do próximo navio no TERMISA?' },
  { label: '🌊 Qual a maré agora?', query: 'Qual a maré agora e a tendência?' },
  { label: '📏 Calcular calado seguro', query: 'Qual o calado máximo e profundidade no canal agora?' },
  { label: '💨 Como estão os ventos?', query: 'Como estão os ventos e rajadas hoje?' },
  { label: '🧂 Volumes de sal 2026', query: 'Quanto de sal já foi embarcado em 2026?' },
  { label: '📅 Maré de amanhã', query: 'Como vai estar a maré amanhã?' },
  { label: '⚓ Sobre o Porto-Ilha TERMISA', query: 'Como funciona o terminal TERMISA da INTERSAL?' },
];

export const NauticalAIAssistant: React.FC<NauticalAIAssistantProps> = ({
  port,
  currentTime,
  tideState,
  weather,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: `Olá! Sou o **Assistente de Inteligência Náutica da INTERSAL** ⚓\n\nEstou conectado aos dados em tempo real de **${port.name}** (${tideState.currentHeight.toFixed(2)}m • ${tideState.trendDescription}).\n\nComo posso ajudar na sua operação ou tirar dúvidas sobre marés, calados e navegação?`,
      timestamp: new Date(),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isTyping]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if (!query || isTyping) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      const responseText = await processNauticalQuery(query, {
        port,
        currentTime,
        tideState,
        weather,
      });

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: responseText,
        timestamp: new Date(),
        contextData: {
          tideHeight: tideState.currentHeight,
          trend: tideState.trend,
          windKnots: weather?.windSpeedKnots,
        },
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          sender: 'assistant',
          text: 'Desculpe, ocorreu uma instabilidade momentânea ao processar sua dúvida. Por favor, tente novamente.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'assistant',
        text: `Chat reiniciado. Estou pronto para tirar dúvidas sobre **${port.name}**!`,
        timestamp: new Date(),
      },
    ]);
  };

  // Helper to render basic markdown formatting
  const renderFormattedText = (content: string) => {
    const lines = content.split('\n');
    return (
      <div className="space-y-1.5 text-xs sm:text-sm leading-relaxed">
        {lines.map((line, idx) => {
          if (!line.trim()) return <div key={idx} className="h-1" />;

          // Bullet points
          if (line.trim().startsWith('• ') || line.trim().startsWith('- ') || line.trim().startsWith('🔹 ')) {
            const formatted = formatInline(line.trim().substring(2));
            return (
              <div key={idx} className="flex items-start gap-1.5 ml-1">
                <span className="text-cyan-400 select-none">•</span>
                <span>{formatted}</span>
              </div>
            );
          }

          return <p key={idx}>{formatInline(line)}</p>;
        })}
      </div>
    );
  };

  const formatInline = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|\`.*?\`|\*.*?\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="font-bold text-slate-100 text-cyan-200">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={index} className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 text-cyan-300 rounded font-mono text-[11px] sm:text-xs">
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return (
          <em key={index} className="italic text-slate-300">
            {part.slice(1, -1)}
          </em>
        );
      }
      return part;
    });
  };

  return (
    <>
      {/* 🔘 Floating Activation Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex items-center gap-2.5 px-3.5 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white rounded-full shadow-2xl shadow-cyan-900/60 border border-cyan-300/40 transition-all transform hover:scale-105 active:scale-95 group"
          title="Tirar Dúvidas com o Assistente de IA Náutica"
        >
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-slate-900/80 flex items-center justify-center border border-cyan-300/60 shadow-inner">
              <Bot className="w-4 h-4 text-cyan-300 group-hover:rotate-12 transition-transform" />
            </div>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-cyan-400 rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-cyan-400 rounded-full" />
          </div>

          <div className="text-left hidden xs:block sm:block pr-1">
            <div className="text-[10px] uppercase font-bold tracking-wider text-cyan-100 flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 text-amber-300" />
              IA Especialista
            </div>
            <div className="text-xs sm:text-sm font-black leading-tight">Dúvidas Náuticas</div>
          </div>
        </button>
      )}

      {/* 💬 Floating Chat Drawer / Window */}
      {isOpen && (
        <div className="fixed bottom-3 right-3 sm:bottom-6 sm:right-6 z-50 w-[94vw] sm:w-[420px] md:w-[460px] h-[560px] max-h-[88vh] bg-slate-950/95 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200">
          {/* Header */}
          <div className="p-3.5 sm:p-4 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-cyan-950 border border-cyan-300/40">
                <Bot className="w-5 h-5 text-slate-950" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm sm:text-base text-white">IA Náutica INTERSAL</h3>
                  <span className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-full">
                    Online
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Waves className="w-3 h-3 text-cyan-400" />
                  {port.name}: <span className="text-cyan-300 font-mono font-bold">{tideState.currentHeight.toFixed(2)}m</span> ({tideState.trend})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClearChat}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                title="Limpar histórico"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
                title="Fechar chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Real-time Telemetry Mini Bar */}
          <div className="px-3.5 py-1.5 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between text-[10px] text-slate-300">
            <span className="flex items-center gap-1">
              <Wind className="w-3 h-3 text-cyan-400" /> Vento: <b>{weather ? weather.windSpeedKnots : 14} kt</b> ({weather ? weather.windDirectionLabel : 'E/SE'})
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" /> Próx. Preamar: <b>{tideState.nextHighEvent.timeStr}h ({tideState.nextHighEvent.height.toFixed(2)}m)</b>
            </span>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-3.5 sm:p-4 overflow-y-auto space-y-3.5 custom-scrollbar">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-cyan-400" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[80%] rounded-2xl p-3 sm:p-3.5 shadow-md ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-br-none'
                      : 'bg-slate-900/90 text-slate-200 border border-slate-800 rounded-tl-none'
                  }`}
                >
                  {msg.sender === 'assistant' ? (
                    renderFormattedText(msg.text)
                  ) : (
                    <p className="text-xs sm:text-sm">{msg.text}</p>
                  )}

                  <div
                    className={`mt-1.5 text-[9px] sm:text-[10px] flex items-center justify-end ${
                      msg.sender === 'user' ? 'text-cyan-100/80' : 'text-slate-500'
                    }`}
                  >
                    {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-2.5 items-center text-xs text-cyan-400">
                <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-cyan-400 animate-pulse" />
                </div>
                <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-2xl rounded-tl-none flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  <span className="text-[11px] text-slate-400 ml-1.5">Analisando marés e tábuas...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions Chips */}
          <div className="px-3.5 py-2 bg-slate-950/90 border-t border-slate-800/80 overflow-x-auto no-scrollbar flex items-center gap-1.5">
            {QUICK_SUGGESTIONS.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(item.query)}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 hover:border-cyan-500/50 border border-slate-800 text-[11px] text-slate-300 hover:text-cyan-300 whitespace-nowrap transition flex items-center gap-1 shrink-0"
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Input Area */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-slate-900/95 border-t border-slate-800 flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Digite sua dúvida náutica (ex: calado seguro, maré...)"
              className="flex-1 px-3.5 py-2 sm:py-2.5 bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:outline-none rounded-xl text-xs sm:text-sm text-slate-100 placeholder:text-slate-500"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isTyping}
              className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-md transition"
              title="Enviar mensagem"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
