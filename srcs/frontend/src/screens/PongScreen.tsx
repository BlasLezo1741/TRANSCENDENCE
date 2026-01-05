import Canvas from '../components/Canvas.tsx';
import { useTranslation } from 'react-i18next';
import type { ScreenProps } from '../ts/screenConf/screenProps.ts';
import type { GameMode } from '../ts/types.ts';

type PongScreenProps = ScreenProps & {
  mode: GameMode;
};

const PongScreen = ({ dispatch, mode }: PongScreenProps) =>
{
  const { t } = useTranslation();
  return (
    <div>
      <h1>{t('juego_mode')}{mode}</h1>
      
      <Canvas mode={mode} dispatch={dispatch}/>

      <button onClick={() => dispatch({ type: "MENU" })}>
      {t('menu')}
      </button>
    </div>
  );
}

export default PongScreen;