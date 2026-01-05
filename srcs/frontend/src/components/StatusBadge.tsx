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
    <div style={{ 
      padding: '5px 10px', 
      borderRadius: '20px', 
      background: isConnected ? '#4caf50' : '#f44336',
      color: 'white',
      display: 'inline-block',
      fontSize: '0.8rem',
      margin: '10px'
    }}>
      {isConnected ? '● Online' : '○ Offline'}
    </div>
  );
}