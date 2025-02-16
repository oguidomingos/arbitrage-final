import { useState, useEffect, useRef, useCallback } from 'react';
import { LogEntry, ArbitrageOpportunity } from '../types';

const WS_URL = 'ws://localhost:3003';
const RECONNECT_INTERVAL = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;
const PING_INTERVAL = 15000;  // 15 seconds
const PONG_TIMEOUT = 5000;   // 5 seconds

export function useWebSocket() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(() => new Date());
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef<number>(0);
  const reconnectTimeout = useRef<number | undefined>(undefined);
  const pingInterval = useRef<number | undefined>(undefined);
  const pongTimeout = useRef<number | undefined>(undefined);

  const manualReconnect = useCallback(() => {
    console.log('Manual reconnect triggered');
    reconnectAttempts.current = 0;
    connect();
  }, []);

  const clearTimers = useCallback(() => {
    if (reconnectTimeout.current) {
      window.clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = undefined;
    }
    if (pingInterval.current) {
      window.clearInterval(pingInterval.current);
      pingInterval.current = undefined;
    }
    if (pongTimeout.current) {
      window.clearTimeout(pongTimeout.current);
      pongTimeout.current = undefined;
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    clearTimers();
    
    const sendPing = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
        pongTimeout.current = window.setTimeout(() => {
          console.log('Pong not received, closing connection');
          if (wsRef.current) {
            wsRef.current.close();
          }
        }, PONG_TIMEOUT);
      }
    };

    pingInterval.current = window.setInterval(sendPing, PING_INTERVAL);
    sendPing(); // Send first ping immediately
  }, [clearTimers]);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message = JSON.parse(event.data);
      console.log('Received message:', message.type);

      switch (message.type) {
        case 'ping':
          wsRef.current?.send(JSON.stringify({ type: 'pong' }));
          break;

        case 'pong':
          if (pongTimeout.current) {
            clearTimeout(pongTimeout.current);
            pongTimeout.current = undefined;
          }
          break;

        case 'logs':
          if (Array.isArray(message.data)) {
            console.log('Setting initial logs:', message.data.length);
            setLogs(message.data);
            setLastUpdate(new Date());
          }
          break;

        case 'log':
          if (message.data) {
            console.log('Adding new log');
            setLogs(prevLogs => [message.data, ...prevLogs]);
            setLastUpdate(new Date());
          }
          break;

        case 'opportunity':
          if (message.data) {
            console.log('New opportunity detected');
            setOpportunities(prev => [message.data, ...prev]);
          }
          break;

        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  }, []);

  const connect = useCallback(() => {
    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        return;
      }

      console.log('Connecting to WebSocket...');
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setIsLoading(false);
        reconnectAttempts.current = 0;
        wsRef.current = ws;
        startHeartbeat();
      };

      ws.onmessage = handleMessage;

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        wsRef.current = null;
        clearTimers();

        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          console.log(`Attempting to reconnect... (${reconnectAttempts.current + 1}/${MAX_RECONNECT_ATTEMPTS})`);
          reconnectTimeout.current = window.setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, RECONNECT_INTERVAL);
        } else {
          setIsLoading(false);
          console.log('Max reconnection attempts reached');
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      return () => {
        clearTimers();
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      return undefined;
    }
  }, [handleMessage, startHeartbeat, clearTimers]);

  useEffect(() => {
    const cleanup = connect();
    return () => {
      if (cleanup) cleanup();
    };
  }, [connect]);

  return {
    logs,
    isConnected,
    isLoading,
    lastUpdate,
    opportunities,
    reconnectAttempts: reconnectAttempts.current,
    maxReconnectAttempts: MAX_RECONNECT_ATTEMPTS,
    manualReconnect
  };
}