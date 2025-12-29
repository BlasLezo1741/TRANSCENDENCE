import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

// Componente del menú principal
type MenuProps = {
  onGame: () => void;
};

export function MenuScreen({ onGame }: MenuProps) {

  const { t } = useTranslation();
  
  return (
    <div>
      <LanguageSwitcher />
      <h1>{t('menu')}</h1>
      <button onClick={onGame}>Jugar</button>
    </div>
  );
}