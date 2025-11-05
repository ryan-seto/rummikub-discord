import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export function useSocket(channelId: string | null) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!channelId) return;

    // Connect using relative URL for Discord proxy
    socketRef.current = io('/socket', {
      path: '/socket',
      transports: ['websocket', 'polling'],
    });

    socketRef.current.on('connect', () => {
      console.log('✅ Connected to server via Socket.io');
      socketRef.current?.emit('join-room', channelId);
    });

    socketRef.current.on('disconnect', () => {
      console.log('❌ Disconnected from server');
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [channelId]);

  const onGameStateUpdate = (callback: (gameState: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on('game-state-update', callback);
      
      return () => {
        socketRef.current?.off('game-state-update', callback);
      };
    }
    return () => {};
  };

  return {
    onGameStateUpdate,
  };
}
