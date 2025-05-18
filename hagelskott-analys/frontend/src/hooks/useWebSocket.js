import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

export const useWebSocket = () => {
  const { token, refreshToken } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000;

  const connectWebSocket = useCallback(async () => {
    if (!token) {
      console.log('Inget token tillgängligt för WebSocket-anslutning');
      return;
    }

    try {
      // Stäng befintlig anslutning om den finns
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        console.log('Stänger befintlig WebSocket-anslutning');
        wsRef.current.close();
      }

      // Försök uppdatera token om det behövs
      let currentToken = token;
      if (reconnectAttemptsRef.current > 0) {
        try {
          const refreshed = await refreshToken();
          if (refreshed) {
            currentToken = refreshed;
          }
        } catch (error) {
          console.error('Kunde inte uppdatera token:', error);
        }
      }

      console.log('Försöker ansluta till WebSocket...');
      const ws = new WebSocket(`${WS_URL}/ws?token=${currentToken}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket ansluten');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      ws.onclose = (event) => {
        console.log('WebSocket frånkopplad:', event.code, event.reason);
        setIsConnected(false);

        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(
            baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current),
            30000
          );
          console.log(`Försöker återansluta om ${delay/1000} sekunder...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connectWebSocket();
          }, delay);
        } else {
          console.log('Max antal återanslutningsförsök uppnått');
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
        } catch (error) {
          console.error('Fel vid parsning av WebSocket-meddelande:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket fel:', error);
        // Försök återansluta vid fel
        if (ws.readyState === WebSocket.CLOSED) {
          ws.close();
        }
      };

    } catch (error) {
      console.error('Fel vid WebSocket-anslutning:', error);
    }
  }, [token, refreshToken]);

  useEffect(() => {
    if (token) {
      connectWebSocket();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [token, connectWebSocket]);

  const sendMessage = useCallback((message) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket är inte ansluten. Meddelande kunde inte skickas.');
      return false;
    }

    try {
      wsRef.current.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Fel vid sändning av meddelande:', error);
      return false;
    }
  }, []);

  return {
    isConnected,
    lastMessage,
    sendMessage
  };
}; 