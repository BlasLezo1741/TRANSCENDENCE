import Canvas from '../components/Canvas.tsx';

import type { ScreenProps } from '../ts/screenConf/screenProps.ts';
import type { GameMode } from '../ts/types.ts';

type PongScreenProps = ScreenProps & {
  mode: GameMode;
};

function PongScreen({ dispatch, mode }: PongScreenProps) {
  return (
    <div>
      <h1>Juego modo: {mode}</h1>
      
      <Canvas mode={mode} />

      <button onClick={() => dispatch({ type: "MENU" })}>
        Volver al Menú
      </button>
    </div>
  );
}

export default PongScreen;