import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export function useSocket(channelId: string | null) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!channelId) return;

    // Connect to Socket.IO through Discord's proxy
    // The '/socket' maps to your backend via URL Mappings
    socketRef.current = io('/', {
      path: '/socket/socket.io', // Socket.IO endpoint path
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current.on('connect', () => {
      console.log('✅ Connected to server via Socket.io');
      console.log('Socket ID:', socketRef.current?.id);
      socketRef.current?.emit('join-room', channelId);
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log('❌ Disconnected from server:', reason);
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
    });

    socketRef.current.on('reconnect', (attemptNumber) => {
      console.log('🔄 Reconnected after', attemptNumber, 'attempts');
      socketRef.current?.emit('join-room', channelId);
    });

    return () => {
      console.log('🔌 Disconnecting socket...');
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
    return () => { };
  };

  return {
    socket: socketRef.current,
    onGameStateUpdate,
  };
}