import type { ScreenProps } from "../ts/screenConf/screenProps.ts";
import type { GameMode } from "../ts/types.ts";
import Header from "../components/Header";
import { useTranslation } from 'react-i18next';

type OptionsProps = ScreenProps & {
  setMode: React.Dispatch<React.SetStateAction<GameMode>>;
};

function ModeScreen({ dispatch, setMode }: OptionsProps)
{
  const { t } = useTranslation();
  const handleMode = (mode: GameMode) => {
    setMode(mode);
    dispatch({ type: "PONG" });
  };

  return (
    <div>
      <Header />
      <h1>{t('modo')}</h1>

      <button onClick={() => handleMode("ia")}>player vs ia</button>
      <button onClick={() => handleMode("local")}>player vs player</button>
      <button onClick={() => handleMode("remote")}>player vs remote</button>
      <button onClick={() => handleMode("remote")}>tournament</button>

      <button onClick={() => dispatch({ type: "MENU" })}>
      {t('menu')}
      </button>

      <button onClick={() => dispatch({ type: "GAME" })}>
      {t('juegos')}
      </button>

    </div>
  );
}

export default ModeScreen;
