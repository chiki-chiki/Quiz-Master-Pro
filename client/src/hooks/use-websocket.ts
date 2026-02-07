import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast';
import { api } from '@shared/routes';
import { WS_EVENTS, type WsMessage } from '@shared/schema';

export function useWebSocket(onMessage?: (message: WsMessage) => void) {
  const socketRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const connect = () => {
      const isProjector = window.location.pathname === "/projector";
      const socket = new WebSocket(wsUrl, isProjector ? "projector" : undefined);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log('Connected to Quiz WebSocket');
      };

      socket.onmessage = (event) => {
        try {
          const message: WsMessage = JSON.parse(event.data);
          
          if (onMessage) {
            onMessage(message);
          }

          switch (message.type) {
            case WS_EVENTS.STATE_UPDATE:
              queryClient.invalidateQueries({ queryKey: [api.state.get.path] });
              queryClient.invalidateQueries({ queryKey: [api.responses.list.path] });
              queryClient.invalidateQueries({ queryKey: ["/api/leaderboard"] });
              break;
              
            case WS_EVENTS.QUIZ_UPDATE:
              queryClient.invalidateQueries({ queryKey: [api.quizzes.list.path] });
              break;
              
            case WS_EVENTS.RESPONSE_UPDATE:
              queryClient.invalidateQueries({ queryKey: [api.responses.list.path] });
              break;
              
            case WS_EVENTS.USER_JOIN:
              queryClient.invalidateQueries({ queryKey: [api.responses.list.path] });
              break;

            case WS_EVENTS.SCORE_UPDATE:
              queryClient.invalidateQueries({ queryKey: ["/api/leaderboard"] });
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
  }, [queryClient, toast, onMessage]);
}
