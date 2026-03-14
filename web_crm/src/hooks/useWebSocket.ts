import { useEffect, useRef, useState, useCallback } from 'react';

interface UseWebSocketOptions {
    url: string;
    enabled?: boolean;
    onMessage?: (data: any) => void;
    reconnectInterval?: number;
    maxRetries?: number;
}

interface UseWebSocketReturn {
    sendMessage: (data: any) => void;
    isConnected: boolean;
    lastMessage: any | null;
}

export function useWebSocket({
    url,
    enabled = true,
    onMessage,
    reconnectInterval = 3000,
    maxRetries = 5,
}: UseWebSocketOptions): UseWebSocketReturn {
    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState<any>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const retriesRef = useRef(0);
    const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const onMessageRef = useRef(onMessage);
    onMessageRef.current = onMessage;

    const getWsUrl = useCallback(() => {
        const token = localStorage.getItem('accessToken');
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = import.meta.env.VITE_WS_URL || `${protocol}//${window.location.hostname}:8000`;
        const separator = url.includes('?') ? '&' : '?';
        return `${host}/${url}${token ? `${separator}token=${token}` : ''}`;
    }, [url]);

    const connect = useCallback(() => {
        if (!enabled) return;
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        try {
            const fullUrl = getWsUrl();
            const ws = new WebSocket(fullUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                setIsConnected(true);
                retriesRef.current = 0;
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    setLastMessage(data);
                    onMessageRef.current?.(data);
                } catch {
                    // ignore parse errors
                }
            };

            ws.onclose = () => {
                setIsConnected(false);
                wsRef.current = null;

                if (enabled && retriesRef.current < maxRetries) {
                    retriesRef.current++;
                    reconnectTimerRef.current = setTimeout(() => {
                        connect();
                    }, reconnectInterval);
                }
            };

            ws.onerror = () => {
                ws.close();
            };
        } catch {
            // connection failed, will retry
        }
    }, [enabled, getWsUrl, reconnectInterval, maxRetries]);

    useEffect(() => {
        connect();

        return () => {
            if (reconnectTimerRef.current) {
                clearTimeout(reconnectTimerRef.current);
            }
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [connect]);

    const sendMessage = useCallback((data: any) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(data));
        }
    }, []);

    return { sendMessage, isConnected, lastMessage };
}
