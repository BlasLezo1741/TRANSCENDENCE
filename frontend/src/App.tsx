import { useState, useEffect } from 'react' // 1. Añadimos useEffect
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
// 2. Importamos tu servicio de socket [cite: 239, 244]
import { socket, sendMove } from './services/socketService'

function App() {
  const [count, setCount] = useState(0)
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
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      {/* Mostramos el estado de la conexión según la V.19  */}
      <p>Estado Red: {isConnected ? '🟢 Online' : '🔴 Offline'}</p>
      <h1>Blas by by. PONG is comming!</h1>
      <div className="card">
      <img src="/lezo.jpg" alt="Blas Logo" style={{ width: '400px' }} />
      </div>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
