import React, { useState } from 'react';
import Canvas from '../components/Canvas.tsx';
import { useTranslation } from 'react-i18next';
import type { ScreenProps } from '../ts/screenConf/screenProps.ts';
import type { GameMode, GameDifficult } from '../ts/types.ts';
import { Countdown } from '../components/Countdown';
import '../css/PongScreen.css';
import { getAvatarUrlById, getDefaultAvatar } from '../assets/avatars';
import { Leaderboard } from '../components/Leaderboard';
import noAvatarUrl from '../assets/nouser_chatgpt.png';

type PongScreenProps = ScreenProps & {
  mode: GameMode;
  difficult: GameDifficult;
  userName: string;
  opponentName: string;
  userAvatar?: string | null;      // Mi avatar
  opponentAvatar?: string | null;  // Avatar del rival
  ballInit: { x: number, y: number } | null;
  playerSide: 'left' | 'right';
  roomId: string;
  chatOpen: boolean;
};

const PongScreen = ({ dispatch, mode, difficult, userName, opponentName, userAvatar, opponentAvatar, ballInit, playerSide, roomId, chatOpen }: PongScreenProps) =>
{
    const { t } = useTranslation();
    if (!userName){
        userName = t('you');
        userAvatar = noAvatarUrl;
    }
    if (!opponentName){
        opponentName = t('guest');
    }
// Si yo estoy a la izquierda: [Yo] vs [Rival]
  // Si yo estoy a la derecha:   [Rival] vs [Yo]
    const leftPlayer = playerSide === 'left' ? userName : opponentName;
    const rightPlayer = playerSide === 'left' ? opponentName : userName;

    const leftAvatarRaw = playerSide === 'left' ? userAvatar : opponentAvatar;
    const rightAvatarRaw = playerSide === 'left' ? opponentAvatar : userAvatar;
    // 4. Función Helper (La misma que en Chat/Perfil)
    const resolveAvatar = (avatarRaw?: string | null, seedId: number = 0) => {
        if (!avatarRaw) return getDefaultAvatar(seedId); 
        if (avatarRaw.startsWith('http') || avatarRaw.startsWith('/')) return avatarRaw;
        const customUrl = getAvatarUrlById(avatarRaw);
        return customUrl || getDefaultAvatar(seedId);
    };


    const [isCountingDown, setIsCountingDown] = useState(true);

  // Para las estadisticas
  const [gameOver, setGameOver] = useState(false);
  //const [showLeaderboard, setShowLeaderboard] = useState(false);
  //Para mostrar el ganador
  const [winnerName, setWinnerName] = useState<string>("");

  //Funcion stadisticas
  const handleGameOver = (winner: string) => {
    setGameOver(true);
    setWinnerName(winner);
  };

return (
    <div className="game">
      
      {/* NUEVA CABECERA CON AVATARES */}
      <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          width: '800px', // Mismo ancho que el canvas
          marginBottom: '10px',
          padding: '10px',
          backgroundColor: 'rgba(0,0,0,0.5)',
          borderRadius: '10px',
          color: 'white'
      }}>
          {/* JUGADOR IZQUIERDA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img 
                  src={resolveAvatar(leftAvatarRaw, 1)} 
                  alt={leftPlayer} 
                  style={{ width: '50px', height: '50px', borderRadius: '50%', border: '2px solid #007bff' }}
              />
              <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{leftPlayer}</span>
          </div>

          {/* INFORMACIÓN CENTRAL */}
          <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>{t('juego_mode')}{mode}</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', letterSpacing: '5px' }}>VS</div>
          </div>

          {/* JUGADOR DERECHA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexDirection: 'row-reverse' }}>
              <img 
                  src={resolveAvatar(rightAvatarRaw, 2)} 
                  alt={rightPlayer} 
                  style={{ width: '50px', height: '50px', borderRadius: '50%', border: '2px solid #ff4444' }}
              />
              <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{rightPlayer}</span>
          </div>
      </div>
      
      <div style={{ position: 'relative', width: '800px', height: '600px' }}>
          {isCountingDown && !gameOver && (
              <Countdown onComplete={() => setIsCountingDown(false)} />
          )}

          <Canvas
            mode={mode}
            difficult={difficult}
            dispatch={dispatch}
            userName={userName}
            opponentName={opponentName}
            ballInit={ballInit}
            playerSide={playerSide} 
            roomId={roomId}
            isGameActive={!isCountingDown && !gameOver}
            onGameOver={handleGameOver} // Pasamos la función al Canvas
            chatOpen={chatOpen}
          />

          {/* NUEVO MODAL DE FIN DE PARTIDA */}
          {gameOver && (
              <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  backgroundColor: 'rgba(0,0,0,0.85)', // Un poco más oscuro para que resalte
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 50,
                  color: 'white'
              }}>
                  <h1 style={{ fontSize: '3rem', marginBottom: '10px', color: '#4ade80' }}>
                      {t('matchEnded')}
                  </h1>
                  {/* 🟢 NUEVO: Mostramos al gran campeón */}
                  <h2 style={{ fontSize: '2rem', marginBottom: '20px', color: '#facc15' }}>
                        {t('game.winner', { name : winnerName })}
                  </h2>
                  
                  {/* Mostramos el ranking directamente si es remoto */}
                  {mode.includes('remote') && (
                      <div style={{ 
                          maxHeight: '350px', 
                          overflowY: 'auto', 
                          marginBottom: '20px', 
                          width: '100%', 
                          display: 'flex', 
                          justifyContent: 'center' 
                      }}>
                          <Leaderboard />
                      </div>
                  )}
                  
                  {/* Botón de volver al menú destacado */}
                  <button 
                      onClick={() => dispatch({ type: "MENU" })} 
                      style={{
                          backgroundColor: '#1f2937', // Fondo oscuro
                          color: '#d1d5db', // Texto claro
                          border: '1px solid #4b5563',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '1.1rem',
                          fontWeight: 'bold',
                          marginTop: '20px', // Un poco más de espacio arriba
                          boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                          transition: 'all 0.2s ease',
                          
                          display: 'flex',             // Convierte el botón en una caja flexible
                          alignItems: 'center',        // Centra el texto verticalmente
                          justifyContent: 'center',    // Centra el texto horizontalmente
                          padding: '15px 40px',        // Padding generoso para que respire
                          whiteSpace: 'nowrap',        // Mantiene el texto en una línea
                          width: 'auto',               // Deja que el ancho se adapte al contenido
                          minWidth: '250px'            // Un ancho mínimo para que tenga presencia
                      }}
                      onMouseOver={(e) => {
                          e.currentTarget.style.backgroundColor = '#374151';
                          e.currentTarget.style.color = 'white';
                          e.currentTarget.style.borderColor = '#6b7280';
                          e.currentTarget.style.transform = 'translateY(-2px)'; // Pequeño efecto de elevación
                      }}
                      onMouseOut={(e) => {
                          e.currentTarget.style.backgroundColor = '#1f2937';
                          e.currentTarget.style.color = '#d1d5db';
                          e.currentTarget.style.borderColor = '#4b5563';
                          e.currentTarget.style.transform = 'translateY(0)';
                      }}
                  >
                      {t('back2Menu')}
                  </button>
              </div>
          )}
      </div>
    </div>
  );

}

export default PongScreen;