import Canvas from '../components/Canvas.tsx';
import { useTranslation } from 'react-i18next';
import type { ScreenProps } from '../ts/screenConf/screenProps.ts';
import type { GameMode } from '../ts/types.ts';

type PongScreenProps = ScreenProps & {
  mode: GameMode;
  userName: string;
  opponentName: string;
  ballInit: { x: number, y: number } | null;
  playerSide: 'left' | 'right';
};

const PongScreen = ({ dispatch, mode, userName, opponentName, ballInit, playerSide }: PongScreenProps) =>
{
  const { t } = useTranslation();
  // Si yo estoy a la izquierda: [Yo] vs [Rival]
  // Si yo estoy a la derecha:   [Rival] vs [Yo]
  const leftPlayer = playerSide === 'left' ? userName : opponentName;
  const rightPlayer = playerSide === 'left' ? opponentName : userName;
  return (
<div style={{ textAlign: 'center' }}>
      {/* 1. TU TÍTULO ORIGINAL (Lo mantengo) */}
      <h1>{t('juego_mode')}{mode} | {leftPlayer} vs {rightPlayer}</h1>
      
      {/* 2. EL CHIVATO DE DEPURACIÓN (Temporal, solo para arreglar el error) */}
      <div style={{ 
          background: '#444', 
          color: '#fff', 
          padding: '10px', 
          margin: '10px auto', 
          width: '80%',
          borderRadius: '5px',
          border: '2px solid red'
      }}>
          <p>🧪 DEBUG INFO:</p>
          <p>Usuario Local: <strong>{userName}</strong></p>
          <p>Lado Asignado por App: <strong style={{ color: playerSide === 'right' ? 'orange' : 'cyan', fontSize: '1.2em' }}>{playerSide.toUpperCase()}</strong></p>
      </div>

      {/* 3. EL CANVAS */}
      <div className="flex justify-center">
        <Canvas
            mode={mode}
            dispatch={dispatch}
            userName={userName}
            opponentName={opponentName}
            ballInit={ballInit}
            playerSide={playerSide} // <--- Esto es lo más importante
        />
      </div>

      <button onClick={() => dispatch({ type: "MENU" })} style={{ marginTop: '20px' }}>
      {t('menu')}
      </button>
    </div>
  );
}

export default PongScreen;