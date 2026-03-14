import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, Send, Loader2, Wifi, WifiOff } from 'lucide-react';
import api from '@/services/api';
import { useAuth } from '@/modules/auth/logic/AuthContext';
import { useWebSocket } from '@/hooks/useWebSocket';

interface Message {
    id: number;
    content: string;
    sender: number;
    sender_name: string;
    timestamp: string;
}

interface ClientChatProps {
    restaurantId: number;
    restaurantName: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function ClientChat({ restaurantId, restaurantName, isOpen, onClose }: ClientChatProps) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // WebSocket connection
    const handleWsMessage = useCallback((data: any) => {
        if (data.content && data.sender) {
            setMessages(prev => {
                // Avoid duplicates
                if (prev.some(m => m.id === data.id)) return prev;
                return [...prev, data as Message];
            });
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    }, []);

    const { sendMessage: wsSend, isConnected } = useWebSocket({
        url: `ws/chat/${restaurantId}/`,
        enabled: isOpen && !!user,
        onMessage: handleWsMessage,
    });

    const loadMessages = async () => {
        try {
            const res = await api.get(`/chat/messages/?restaurant_id=${restaurantId}`);
            setMessages(res.data.results || res.data);
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        } catch (error) {
            console.error('Failed to load chat messages', error);
        }
    };

    useEffect(() => {
        if (isOpen && user) {
            setLoading(true);
            loadMessages().finally(() => setLoading(false));

            // Fallback to polling only if WebSocket is not connected
            if (!isConnected) {
                const interval = setInterval(loadMessages, 5000);
                return () => clearInterval(interval);
            }
        }
    }, [isOpen, restaurantId, user, isConnected]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || sending) return;

        setSending(true);
        try {
            if (isConnected) {
                // Use WebSocket for instant delivery
                wsSend({ message: newMessage.trim() });
                setNewMessage('');
            } else {
                // Fallback to REST API
                const res = await api.post('/chat/messages/', {
                    restaurant: restaurantId,
                    content: newMessage.trim(),
                });
                setMessages(prev => [...prev, res.data]);
                setNewMessage('');
                setTimeout(() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
            }
        } catch (error) {
            console.error('Failed to send message', error);
        } finally {
            setSending(false);
        }
    };

    if (!isOpen) return null;

    if (!user) {
        return (
            <div className="fixed bottom-6 right-6 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden flex flex-col h-96">
                <div className="bg-slate-900 p-4 flex items-center justify-between text-white">
                    <h3 className="font-bold text-sm tracking-wide">Chat with {restaurantName}</h3>
                    <button onClick={onClose} className="hover:bg-white/20 p-1.5 rounded-lg transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                        <MessageCircle className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-medium text-slate-500">Please log in to send direct messages to the restaurant.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden flex flex-col h-[500px] max-h-[80vh]">
            <div className="bg-slate-900 p-4 flex items-center justify-between text-white shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                        <MessageCircle className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-sm tracking-wide truncate max-w-[200px]">{restaurantName}</h3>
                    <div className="flex items-center" title={isConnected ? 'Live connection' : 'Polling mode'}>
                        {isConnected
                            ? <Wifi className="w-3 h-3 text-emerald-400" />
                            : <WifiOff className="w-3 h-3 text-amber-400" />
                        }
                    </div>
                </div>
                <button onClick={onClose} className="hover:bg-white/20 p-1.5 rounded-lg transition-colors shrink-0">
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                {loading && messages.length === 0 ? (
                    <div className="flex justify-center items-center h-full">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest pt-8">
                        No messages yet.<br />Send a message to start chatting!
                    </div>
                ) : (
                    messages.map((msg, i) => {
                        const isMine = msg.sender === user.id;
                        return (
                            <div key={msg.id || i} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${isMine
                                    ? 'bg-primary text-white rounded-tr-sm'
                                    : 'bg-white border border-slate-100 text-slate-700 rounded-tl-sm shadow-sm'
                                    }`}>
                                    {msg.content}
                                </div>
                                <span className="text-[10px] text-slate-400 mt-1 px-1 font-medium">
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-100 shrink-0">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all font-medium"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim() || sending}
                        className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:hover:bg-primary"
                    >
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
                    </button>
                </div>
            </form>
        </div>
    );
}
