import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast';
import { api } from '@shared/routes';
import { WS_EVENTS, type WsMessage } from '@shared/schema';

export function useWebSocket() {
  const socketRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    // Determine WS protocol based on current page protocol
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const connect = () => {
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log('Connected to Quiz WebSocket');
      };

      socket.onmessage = (event) => {
        try {
          const message: WsMessage = JSON.parse(event.data);
          
          switch (message.type) {
            case WS_EVENTS.STATE_UPDATE:
              queryClient.invalidateQueries({ queryKey: [api.state.get.path] });
              queryClient.invalidateQueries({ queryKey: [api.responses.list.path] });
              break;
              
            case WS_EVENTS.QUIZ_UPDATE:
              queryClient.invalidateQueries({ queryKey: [api.quizzes.list.path] });
              break;
              
            case WS_EVENTS.RESPONSE_UPDATE:
              queryClient.invalidateQueries({ queryKey: [api.responses.list.path] });
              break;
              
            case WS_EVENTS.USER_JOIN:
              // Optionally show a toast or just refresh user lists if we had one
              queryClient.invalidateQueries({ queryKey: [api.responses.list.path] });
              break;
          }
        } catch (err) {
          console.error('Failed to parse WS message', err);
        }
      };

      socket.onclose = () => {
        console.log('WebSocket disconnected, attempting reconnect...');
        setTimeout(connect, 3000);
      };
      
      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    };

    connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [queryClient, toast]);
}
