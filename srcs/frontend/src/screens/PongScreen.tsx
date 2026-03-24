import React, { useState, useEffect } from 'react';
import Canvas from '../components/Canvas.tsx';
import { useTranslation } from 'react-i18next';
import type { ScreenProps } from '../ts/screenConf/screenProps.ts';
import type { GameMode, GameDifficult } from '../ts/types.ts';
import { Countdown } from '../components/Countdown';
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

    const [opponent, setOpponent] = useState<string>(opponentName);

    if (!userName)
    {
        userName = t('you');
        userAvatar = noAvatarUrl;
    }

    // useEffect(() =>
    // {
    //     if (!opponentName)
    //     {
    //         setOpponent(t('guest'));
    //         //opponentName = t('guest');
    //     }
    // }, opponentName, t, opponent);

    useEffect(() => {
        if (!opponentName) {
            setOpponent(t('guest'));
        } else {
            setOpponent(opponentName);
        }
    }, [opponentName, t]);
    
// Si yo estoy a la izquierda: [Yo] vs [Rival]
  // Si yo estoy a la derecha:   [Rival] vs [Yo]
    const leftPlayer = playerSide === 'left' ? userName : opponent;
    const rightPlayer = playerSide === 'left' ? opponent : userName;

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
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  //Para mostrar el ganador
  const [winnerName, setWinnerName] = useState<string>("");

  //Funcion stadisticas
  const handleGameOver = (winner: string) => {
    setGameOver(true);
    setWinnerName(winner);
  };

  const [scale, setScale] = useState(1.0);

useEffect(() =>
{
    const canvasWidth = 800;
    const canvasHeight = 600;

    const updateTransform = () =>
    {
        const w = window.innerWidth;
        const h = window.innerHeight;

        const newScale = Math.min(
            1,
            (w - 50) / canvasWidth,
            (h - 50) / canvasHeight
        );

        setScale(newScale);
    };

    updateTransform();
    window.addEventListener("resize", updateTransform);
    return () => window.removeEventListener("resize", updateTransform);
}, []);


  return (
    <div
        className="w-full h-full mx-auto flex flex-col items-center justify-center"
        style={{
            transform: `scale(${scale})`,
            transformOrigin: "center center",
        }}   
    >
      
      {/* CABECERA CON AVATARES */}
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
          <div className="flex flex-col items-center justify-center">
              {/* Cartel de Modo de Juego (Tamaño aumentado y estilizado) */}
              <div className="!text-[1.1rem] !font-semibold !px-4 !py-1.5 !bg-black/60 !rounded-lg !border !border-gray-500/50 !text-gray-200 !mb-1 !tracking-wide">
                  {t('juego_mode')}{mode}
              </div>
              <div className="!text-[2rem] !font-bold !tracking-[5px] !mt-1">VS</div>
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
            onGameOver={handleGameOver} 
            chatOpen={chatOpen}
          />

          {/* --- LÓGICA DE FIN DE PARTIDA SECUENCIAL --- */}
          {gameOver && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center !bg-black/80 backdrop-blur-md !p-6">
                  
                  {/* --- PASO 1: MODAL DEL GANADOR (showLeaderboard === false) --- */}
                  {!showLeaderboard ? (
                      <div className="!bg-[#111827] !border-2 !border-orange-600 !rounded-3xl !shadow-[0_0_40px_rgba(234,88,12,0.6)] !w-full !max-w-xl flex flex-col items-center justify-center !p-12 !overflow-hidden relative">
                          
                          {/* Títulos de Victoria LIMPIOS y ajustados */}
                          {/* Aumentado mb-16 para separar drásticamente el botón */}
                          <div className="text-center !mb-0 mt-4 !py-16">
                              <h1 className="!m-0 text-[2.2rem] font-extrabold text-[#4ade80] uppercase tracking-widest drop-shadow-md leading-tight">
                                  {t('matchEnded')}
                              </h1>
                              <h2 className="!m-0 mt-8 text-[1.8rem] font-bold text-[#facc15] tracking-wide leading-snug">
                                  🏆 {t('game.winner', { name : winnerName })} 🏆
                              </h2>
                          </div>
                          
                          {/* Botón Cambiado a ACEPTAR (Clave t('modal.accept_btn')) */}
                          <button 
                              onClick={() => setShowLeaderboard(true)} 
                              className="!px-12 !py-3 !min-w-[240px] !rounded-full !bg-orange-600 hover:!bg-orange-700 !text-white !font-extrabold !text-sm !uppercase !tracking-wider !transition-transform hover:scale-105 !shadow-lg !shadow-orange-600/30 !m-0 !border-none"
                          >
                              {t('modal.accept_btn', 'ACEPTAR')}
                          </button>
                      </div>

                  ) : (
                      
                      /* --- PASO 2: MODAL DE ESTADÍSTICAS (showLeaderboard === true) --- */
                      <div className="!bg-[#111827] !border-2 !border-orange-600 !rounded-3xl !shadow-[0_0_40px_rgba(234,88,12,0.6)] !w-full !max-w-3xl flex flex-col items-center justify-center !p-12 !overflow-hidden relative">
                          
                          {/* Eliminado el título externo que añadí yo anteriormente, recuperando la estructura original */}
                          
                          {mode.includes('remote') && (
                              <div className="w-full bg-black/40 rounded-xl border border-gray-700 p-4 custom-scrollbar !mb-12">
                                  {/* !max-h-[35vh] overflow-y-auto custom-scrollbar para el scroll interno */}
                                  <div className="!max-h-[35vh] !overflow-y-auto custom-scrollbar">
                                      <Leaderboard />
                                  </div>
                              </div>
                          )}
                          
                          {/* Botón de volver al menú (ESTILO GRIS UNIFICADO) */}
                          <button 
                              onClick={() => dispatch({ type: "MENU" })} 
                              className="!px-10 !py-3.5 !min-w-[180px] !rounded-full !bg-gray-700/50 hover:!bg-gray-600 !text-white !font-bold !text-sm !uppercase !tracking-wider !transition-colors !border !border-gray-600 !m-0"
                          >
                              &larr; {t('back2Menu')}
                          </button>
                      </div>
                  )}
              </div>
          )}
      </div>
    </div>
  );

}

export default PongScreen;
