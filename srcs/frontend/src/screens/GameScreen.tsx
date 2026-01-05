import type { ScreenProps } from "../ts/screenConf/screenProps";
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

function GameScreen({ dispatch }: ScreenProps)
{
    const { t } = useTranslation();
    return (
        <div>
            <LanguageSwitcher />
            <h1>{t('juegos')}</h1>
            
            <button onClick={() => dispatch({ type: "MODE" })}>
                PONG
            </button>

            <button onClick={() => dispatch({ type: "MENU" })}>
            {t('menu')}
            </button>
        </div>
    );
}

export default GameScreen;
