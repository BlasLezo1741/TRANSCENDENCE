import { useState, useEffect } from 'react' // Añadimos useEffect
import { MenuScreen } from './screens/MenuScreen.tsx';
import { GameScreen } from './screens/GameScreen.tsx';
// 1. Importamos los estilos para que el layout funcione
import './App.css'
// 2. Importamos tu infraestructura de comunicación
import { socket } from './services/socketService'

type Screen = "menu" | "game";

function App() {
  const [screen, setScreen] = useState<Screen>("menu");
// 2. Mantenemos el estado de conexión que pide la V.19
// Estado para ver si la conexión funciona 
  const [isConnected, setIsConnected] = useState(socket.connected)

  // 3. Bloque de comunicación 
  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
      console.log("¡Conectado al servidor!");
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);
  
  return (
    <div>
      {/* 3. Indicador visual de red (útil para depurar en Codespaces) */}
      <div style={{ 
        position: 'fixed', top: 10, right: 10, 
        padding: '5px 10px', borderRadius: '5px',
        background: isConnected ? '#2ecc71' : '#e74c3c',
        color: 'white', fontSize: '12px', zIndex: 1000
      }}>
        {isConnected ? '🟢 Server Connected' : '🔴 Server Offline'}
      </div>

      {/* 4. Navegación del juego de tu compañero */}
      {screen === "menu" && <MenuScreen onGame={() => setScreen("game")} />}
      {screen === "game" && <GameScreen onMenu={() => setScreen("menu")} />}
    </div>
  );
}

export default App;