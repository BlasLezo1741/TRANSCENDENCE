import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../components/LanguageSwitcher.tsx';
import type { ScreenProps } from '../ts/screenConf/screenProps.ts';
import { joinQueue } from '../services/socketService.ts';

// Cambiamos MenuProps por ScreenProps para usar el dispatch
export function MenuScreen({ dispatch }: ScreenProps) {
  const { t } = useTranslation();

  const handleStartButtonClick = () => {
    dispatch({ type: "GAME" }); 
  };
  
  return (
    <div>
      <LanguageSwitcher />
      <h1>{t('menu')}</h1>
      
      {/* El botón ahora ejecuta la lógica combinada */}
      <button onClick={handleStartButtonClick}>
        {t('Jugar')}
      </button>
    </div>
  );
}

export default MenuScreen;