import Canvas from '../components/Canvas.tsx';
import { useTranslation } from 'react-i18next';
import type { ScreenProps } from '../ts/screenConf/screenProps.ts';
import type { GameMode } from '../ts/types.ts';

type PongScreenProps = ScreenProps & {
  mode: GameMode;
  userName: string;
  opponentName: string;
};

const PongScreen = ({ dispatch, mode, userName, opponentName }: PongScreenProps) =>
{
  const { t } = useTranslation();
  return (
    <div>
      <h1>{t('juego_mode')}{mode} | {userName} vs {opponentName}</h1>
      
      <Canvas mode={mode} dispatch={dispatch} userName={userName} opponentName={opponentName}/>

      <button onClick={() => dispatch({ type: "MENU" })}>
      {t('menu')}
      </button>
    </div>
  );
}

export default PongScreen;