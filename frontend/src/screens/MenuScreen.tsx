import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { joinQueue } from '../services/socketService'; // 1. Importamos el emisor

// Componente del menú principal
type MenuProps = {
  onGame: () => void;
};

export function MenuScreen({ onGame }: MenuProps) {

  const { t } = useTranslation();
  // 2. Creamos una función intermedia
  const handleStartButtonClick = () => {
    // Avisamos al servidor (esto activará la validación del DTO)
    // Por ahora usamos un ID temporal "Invitado"
    joinQueue("Invitado_Local");
    // Ejecutamos la lógica que ya tenías para cambiar de pantalla
    onGame();
  };
  return (
    <div>
      <LanguageSwitcher />
      <h1>{t('menu')}</h1>
      <button onClick={handleStartButtonClick}>
        {t('Jugar')}</button>
    </div>
  );
}