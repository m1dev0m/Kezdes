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

function isLocalLikeHostname(hostname: string) {
    return (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '0.0.0.0' ||
        /^10\./.test(hostname) ||
        /^192\.168\./.test(hostname) ||
        /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
    );
}

function getDefaultWebSocketBaseUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const devPorts = new Set(['3000', '4173', '5173', '5174', '5175']);

    if (isLocalLikeHostname(window.location.hostname) || devPorts.has(window.location.port)) {
        return `${protocol}//${window.location.hostname}:8000`;
    }

    return `${protocol}//${window.location.host}`;
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
        let token: string | null = null;
        try {
            token = localStorage.getItem('accessToken');
        } catch {
            try {
                token = sessionStorage.getItem('accessToken');
            } catch {
                token = null;
            }
        }
        const host = (import.meta.env.VITE_WS_URL || getDefaultWebSocketBaseUrl()).replace(/\/+$/, '');
        const normalized = url.replace(/^\/+/, '');
        const separator = normalized.includes('?') ? '&' : '?';
        return `${host}/${normalized}${token ? `${separator}token=${token}` : ''}`;
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
