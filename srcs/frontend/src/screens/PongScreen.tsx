import React, { useState } from 'react';
import Canvas from '../components/Canvas.tsx';
import { useTranslation } from 'react-i18next';
import type { ScreenProps } from '../ts/screenConf/screenProps.ts';
import type { GameMode, GameDifficult } from '../ts/types.ts';
import { Countdown } from '../components/Countdown';
import { getAvatarUrlById, getDefaultAvatar } from '../assets/avatars';
import { Leaderboard } from '../components/Leaderboard';
import noAvatarUrl from '../assets/nouser_chatgpt.png';
import '../css/PongScreen.css';

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
      <div className="flex justify-between items-center w-[800px] mb-2.5 p-2.5 bg-[rgba(0,0,0,0.5)] rounded-[10px] text-white">
          {/* JUGADOR IZQUIERDA */}
          <div className="flex items-center gap-2.5">
              <img 
                  src={resolveAvatar(leftAvatarRaw, 1)} 
                  alt={leftPlayer} 
                  className="w-[50px] h-[50px] rounded-full border-2 border-[#007bff]"
              />
              <span className="text-[1.2rem] font-bold">{leftPlayer}</span>
          </div>

          {/* INFORMACIÓN CENTRAL */}
          <div className="text-center">
              <div className="text-[0.8rem] opacity-80">{t('juego_mode')}{mode}</div>
              <div className="text-[2rem] font-bold tracking-[5px]">VS</div>
          </div>

          {/* JUGADOR DERECHA */}
          <div className="flex items-center gap-2.5 flex-row-reverse">
              <img 
                  src={resolveAvatar(rightAvatarRaw, 2)} 
                  alt={rightPlayer} 
                  className="w-[50px] h-[50px] rounded-full border-2 border-[#ff4444]"
              />
              <span className="text-[1.2rem] font-bold">{rightPlayer}</span>
          </div>
      </div>
      
      <div className="relative w-[800px] h-[600px]">
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
              <div className="absolute top-0 left-0 w-full h-full bg-[rgba(0,0,0,0.85)] flex flex-col items-center justify-center z-50 text-white">
                  <h1 className="text-[3rem] mb-2.5 text-[#4ade80]">
                      {t('matchEnded')}
                  </h1>
                  {/* 🟢 NUEVO: Mostramos al gran campeón */}
                  <h2 className="text-[2rem] mb-5 text-[#facc15]">
                        {t('game.winner', { name : winnerName })}
                  </h2>
                  
                  {/* Mostramos el ranking directamente si es remoto */}
                  {mode.includes('remote') && (
                      <div className="max-h-[350px] overflow-y-auto mb-5 w-full flex justify-center">
                          <Leaderboard />
                      </div>
                  )}
                  
                  {/* Botón de volver al menú destacado */}
                  <button 
                      onClick={() => dispatch({ type: "MENU" })} 
                      className="btn bg-[#1f2937] text-[#d1d5db] border border-[#4b5563] text-[1.1rem] mt-5 shadow-[0_4px_6px_rgba(0,0,0,0.3)] transition-all ease-in-out flex items-center justify-center whitespace-nowrap w-auto min-w-[250px]"
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