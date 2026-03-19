import { useState, useEffect } from 'react';
import { socket } from '../services/socketService';

export function StatusBadge() {
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    function onConnect() { setIsConnected(true); }
    function onDisconnect() { setIsConnected(false); }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  return (
    <div className={`p-1.5 px-2.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} text-white inline-block text-xs m-2`}>
      {isConnected ? '● Online' : '○ Offline'}
    </div>
  );
}