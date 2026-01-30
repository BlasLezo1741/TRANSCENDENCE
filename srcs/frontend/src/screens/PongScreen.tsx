import React, { useState } from 'react';
import Canvas from '../components/Canvas.tsx';
import { useTranslation } from 'react-i18next';
import type { ScreenProps } from '../ts/screenConf/screenProps.ts';
import type { GameMode } from '../ts/types.ts';
import { Countdown } from '../components/Countdown';

type PongScreenProps = ScreenProps & {
  mode: GameMode;
  userName: string;
  opponentName: string;
  ballInit: { x: number, y: number } | null;
  playerSide: 'left' | 'right';
  roomId: string;
};

const PongScreen = ({ dispatch, mode, userName, opponentName, ballInit, playerSide, roomId }: PongScreenProps) =>
{
  const { t } = useTranslation();
  // Si yo estoy a la izquierda: [Yo] vs [Rival]
  // Si yo estoy a la derecha:   [Rival] vs [Yo]
  const leftPlayer = playerSide === 'left' ? userName : opponentName;
  const rightPlayer = playerSide === 'left' ? opponentName : userName;
  const [isCountingDown, setIsCountingDown] = useState(true);

  return (
    // Contenedor Principal para centrar todo en la pantalla
    <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        width: '100%',
        height: '100%' // O minHeight: '100vh' si quieres pantalla completa
    }}>
      
      {/* TÍTULO */}
      <h1 style={{ marginBottom: '10px' }}>
          {t('juego_mode')}{mode} | {leftPlayer} vs {rightPlayer}
      </h1>
      
      {/* CONTENEDOR DEL JUEGO (Relativo) 
          Importante: Le damos el tamaño exacto del Canvas (800x600)
          para que la cuenta atrás se superponga perfectamente.
      */}
      <div style={{ position: 'relative', width: '800px', height: '600px' }}>
          
          {/* A. LA CUENTA ATRÁS (Overlay Absolute) */}
          {isCountingDown && (
              <Countdown onComplete={() => setIsCountingDown(false)} />
          )}

          {/* B. EL CANVAS */}
          <Canvas
            mode={mode}
            dispatch={dispatch}
            userName={userName}
            opponentName={opponentName}
            ballInit={ballInit}
            playerSide={playerSide} 
            roomId={roomId}
            isGameActive={!isCountingDown}
          />
      </div>
    </div>
  );
}

export default PongScreen;