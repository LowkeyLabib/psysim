import React, { useState, useRef, useEffect } from 'react';
import { ConsultationMessage, PatientInfo } from '../../types/api.js';
import { Send, User, Bot, Sparkles } from 'lucide-react';

interface ChatWindowProps {
  patient: PatientInfo;
  messages: ConsultationMessage[];
  loadingReply: boolean;
  onSendMessage: (text: string) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  patient,
  messages,
  loadingReply,
  onSendMessage,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loadingReply]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || loadingReply) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const quickPhrases = [
    'আপনার ঘুম কেমন হচ্ছে?',
    'কবে থেকে এমন সমস্যা শুরু হয়েছে?',
    'কাজে বা পড়াশোনায় কোনো অসুবিধা হচ্ছে?',
    'আগে কখনো এমন মানসিক সমস্যা হয়েছিল?',
    'Do you have thoughts of harming yourself?',
  ];

  return (
    <div className="flex flex-col h-[650px] bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Patient Consultation Header */}
      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-psysim-navy text-white flex items-center justify-center font-bold text-sm shadow">
            {patient.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm text-slate-900">{patient.name}</span>
              <span className="text-xs text-slate-500">
                ({patient.age} yrs, {patient.gender})
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Occupation: {patient.occupation} • Affect: {patient.personality}
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live Consultation</span>
          </span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50">
        {messages.map((msg) => {
          const isStudent = msg.sender === 'student';
          return (
            <div
              key={msg.id}
              className={`flex items-start space-x-3 ${isStudent ? 'flex-row-reverse space-x-reverse' : ''}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  isStudent
                    ? 'bg-psysim-coral text-white'
                    : 'bg-psysim-navy text-white'
                }`}
              >
                {isStudent ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                  isStudent
                    ? 'bg-psysim-navy text-white rounded-tr-none'
                    : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-none font-sans'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
                <div
                  className={`text-[10px] mt-1 text-right ${
                    isStudent ? 'text-slate-300' : 'text-slate-400'
                  }`}
                >
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {loadingReply && (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-psysim-navy text-white flex items-center justify-center text-xs flex-shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"></span>
              <span
                className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
                style={{ animationDelay: '0.2s' }}
              ></span>
              <span
                className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
                style={{ animationDelay: '0.4s' }}
              ></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Clinical Prompts Bar */}
      <div className="px-4 py-2 bg-slate-100/70 border-t border-slate-200 flex items-center space-x-2 overflow-x-auto text-xs whitespace-nowrap">
        <span className="flex items-center space-x-1 text-slate-500 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-psysim-coral" />
          <span>Quick Inquiries:</span>
        </span>
        {quickPhrases.map((phrase, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setInputText(phrase)}
            className="px-2.5 py-1 rounded-full bg-white hover:bg-slate-200/80 text-slate-700 border border-slate-200 text-xs transition-colors shadow-2xs"
          >
            {phrase}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSend} className="p-3.5 bg-white border-t border-slate-200 flex items-center space-x-2.5">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask a question in English, বাংলা, or Banglish (e.g. 'Koto din dhore emon hocche?')..."
          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-psysim-coral/50 focus:border-psysim-coral font-sans"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || loadingReply}
          className="p-2.5 rounded-xl bg-psysim-coral hover:bg-psysim-coral-hover text-white transition-colors disabled:opacity-50 shadow-sm"
          title="Send inquiry"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};
