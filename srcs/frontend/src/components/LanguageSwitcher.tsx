import { useTranslation } from 'react-i18next';
import cataloniaFlag from '../assets/Flag_of_Catalonia.png';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  // Helper component
  const FlagIcon = ({ src, alt }) => (
    <img 
      src={src} 
      alt={alt} 
      // 1. Removed 'rounded-full' to match your screenshot (add it back if you want circles)
      // 2. Used 'object-cover' to keep aspect ratio
      className="w-5 h-5 object-cover block" 
      style={{ width: '20px', height: '15px' }} // Adjusted height for rectangular flag proportion
    />
  )

  return (
    <div className="language-switcher">
      <div className="flex gap-2 items-center">        
        <button onClick={() => changeLanguage('en')}>🇬🇧 English</button>
        <button onClick={() => changeLanguage('es')}>🇪🇸 Español</button>

        <button 
          onClick={() => changeLanguage('ca')} 
          className="inline-flex items-center gap-2"
        >
          <FlagIcon src={cataloniaFlag} alt="Català" />
          <span className="leading-none pb-[2px]"> Català</span>
        </button>
        <button onClick={() => changeLanguage('fr')}>🇫🇷 Français</button>
      </div>
    </div>
  );
}