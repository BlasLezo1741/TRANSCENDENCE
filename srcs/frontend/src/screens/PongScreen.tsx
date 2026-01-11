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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
      
      {/* TÍTULO */}
      <h1 className="text-3xl font-bold mb-4">
        {t('juego_mode')} {mode} | {leftPlayer} vs {rightPlayer}
      </h1>

      {/* ================================================================= */}
      {/* 🚧 TODO: ELIMINAR ESTE BLOQUE AL TERMINAR LAS PRUEBAS (DEBUG) 🚧 */}
      <div className="mb-4 p-3 bg-gray-800 rounded border-2 border-red-500 text-sm text-gray-300 w-full max-w-2xl text-center">
          <p className="font-bold text-red-400 uppercase">🧪 Debug Info (Borrar luego)</p>
          <div className="flex justify-around mt-2">
            <p>Usuario Local: <span className="text-white font-mono">{userName}</span></p>
            <p>
                Lado Asignado: 
                <span className={`font-mono font-bold ml-2 ${playerSide === 'left' ? 'text-cyan-400' : 'text-orange-400'}`}>
                    {playerSide.toUpperCase()}
                </span>
            </p>
          </div>
      </div>
      {/* ================================================================= */}

      {/* CANVAS CON BORDE */}
      <div className="border-4 border-white shadow-2xl rounded-lg overflow-hidden">
        <Canvas
            mode={mode}
            dispatch={dispatch}
            userName={userName}
            opponentName={opponentName}
            ballInit={ballInit}
            playerSide={playerSide} 
        />
      </div>

      {/* BOTÓN SALIR */}
      <button 
        onClick={() => dispatch({ type: "MENU" })} 
        className="mt-6 px-6 py-2 bg-red-600 hover:bg-red-700 rounded text-white font-bold transition"
      >
        {t('menu')}
      </button>

    </div>
  );
}

export default PongScreen;