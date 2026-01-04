import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import type { ScreenProps } from '../ts/screenConf/screenProps.ts';

function MenuScreen({ dispatch }: ScreenProps)
{
  const { t } = useTranslation();
  
  return (
    <div>
      <LanguageSwitcher />
      <h1>{t('menu')}</h1>
      
      <button onClick={() => dispatch({ type: "GAME" })}>
      {t('juegos')}
      </button>

    </div>
  );
}

export default MenuScreen;