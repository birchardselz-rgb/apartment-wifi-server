'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const AI_API = '/api/ai/chat';

function getVisitorId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('ai_visitor_id');
  if (!id) {
    id = 'visitor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    localStorage.setItem('ai_visitor_id', id);
  }
  return id;
}

const QUICK_REPLIES = [
  { text: '宽带多少钱', label: '💰 宽带多少钱' },
  { text: '什么时候到期', label: '⏰ 什么时候到期' },
  { text: '上不了网', label: '🔧 上不了网' },
  { text: '怎么连WiFi', label: '📶 怎么连WiFi' },
  { text: '查我的信息', label: '📋 查我的信息' },
  { text: '转人工客服', label: '👤 转人工' },
];

export default function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [wechatId, setWechatId] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setWechatId(getVisitorId());
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = useCallback((content: string, role: string) => {
    setMessages(prev => [...prev, { role, content }]);
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || sending) return;
    const q = text.trim();
    setInput('');
    addMessage(q, 'user');
    setSending(true);

    try {
      const res = await fetch(AI_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wechat_id: wechatId, question: q }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        let answer = data.data.answer;
        if (data.data.ticket_no) {
          answer += '\n\n📋 工单编号: ' + data.data.ticket_no;
        }
        addMessage(answer, 'ai');
      } else {
        addMessage('抱歉，服务暂时繁忙，请稍后再试。', 'ai');
      }
    } catch {
      addMessage('网络连接失败，请检查网络后重试。', 'ai');
    } finally {
      setSending(false);
    }
  }, [sending, wechatId, addMessage]);

  return (
    <>
      {/* Chat bubble button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        style={{ display: open ? 'none' : 'flex' }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-5 right-5 z-50 w-[360px] h-[520px] rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex flex-col"
            style={{ backgroundColor: '#0F1524', maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100vh - 32px)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#1a1a2e] to-[#16213e] shrink-0">
              <div>
                <h3 className="text-white font-bold text-sm">DVS网络 - AI客服</h3>
                <p className="text-[10px] text-cyan-400/70">宽带咨询 · 报修 · 查询</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white p-1">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3" style={{ backgroundColor: '#0B0F19' }}>
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-600/20 flex items-center justify-center mb-3">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                  </div>
                  <h4 className="text-white text-sm font-bold mb-1">您好！我是AI客服助手</h4>
                  <p className="text-gray-500 text-xs leading-relaxed">
                    我可以帮您：<br />
                    📋 查询宽带套餐和价格<br />
                    ⏰ 查询到期时间<br />
                    🔧 提交网络报修<br />
                    📖 解答常见问题
                  </p>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-br-md'
                        : 'bg-[#1a1d2e] text-gray-200 rounded-bl-md border border-white/5'
                    }`}
                    style={{ wordBreak: 'break-word' }}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {sending && (
                <div className="flex justify-start">
                  <div className="bg-[#1a1d2e] border border-white/5 rounded-2xl rounded-bl-md px-4 py-3 flex gap-1">
                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick replies */}
            {messages.length === 0 && (
              <div className="px-3 py-2 flex gap-1.5 overflow-x-auto shrink-0" style={{ backgroundColor: '#0F1524', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                {QUICK_REPLIES.map(qr => (
                  <button
                    key={qr.text}
                    onClick={() => sendMessage(qr.text)}
                    className="text-[11px] whitespace-nowrap px-2.5 py-1.5 rounded-full border border-gray-700 text-gray-400 hover:border-cyan-500 hover:text-cyan-400 transition-colors shrink-0"
                  >
                    {qr.label}
                  </button>
                ))}
              </div>
            )}

            {/* Input area */}
            <div className="flex items-center gap-2 px-3 py-2.5 shrink-0" style={{ backgroundColor: '#0F1524', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
                placeholder="输入您的问题..."
                className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-3.5 py-2 text-white text-sm outline-none focus:border-cyan-500 transition-colors"
                style={{ backgroundColor: '#1a1d2e' }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || sending}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 disabled:opacity-40 text-white px-4 py-2 rounded-xl text-sm font-bold"
              >
                发送
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
