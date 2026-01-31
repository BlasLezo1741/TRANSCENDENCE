import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import cataloniaFlag from '../assets/Flag_of_Catalonia.png';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [activeLanguage, setActiveLanguage] = useState(i18n.language);

  useEffect(() => {
    setActiveLanguage(i18n.language);
  }, [i18n.language]);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setActiveLanguage(lng);
  };

  const FlagIcon = ({ src, alt }: { src: string; alt: string }) => (
    <img 
      src={src} 
      alt={alt} 
      style={{ width: '20px', height: '15px' }} // proporción rectangular
    />
  );

  return (
    <div className="language-switcher">
      <div className="lang-but">        
        <button
          onClick={() => changeLanguage('en')}
          className={activeLanguage === 'en' ? 'lang-sel' : ''}>
          🇬🇧 English
        </button>

        <button
          onClick={() => changeLanguage('es')}
          className={activeLanguage === 'es' ? 'lang-sel' : ''}>
          🇪🇸 Español
        </button>

        <button
          onClick={() => changeLanguage('ca')}
          className={`cat ${activeLanguage === 'ca' ? 'lang-sel' : ''}`}>
          <FlagIcon src={cataloniaFlag} alt="Català" />
          <span> Català</span>
        </button>

        <button
          onClick={() => changeLanguage('fr')}
          className={activeLanguage === 'fr' ? 'lang-sel' : ''}>
          🇫🇷 Français
        </button>
      </div>
    </div>
  );
}

// import { useTranslation } from 'react-i18next';
// import cataloniaFlag from '../assets/Flag_of_Catalonia.png';

// export function LanguageSwitcher() {
//   const { i18n } = useTranslation();

//   const changeLanguage = (lng: string) => {
//     i18n.changeLanguage(lng);
//   };

//   const FlagIcon = ({ src, alt }) => (
//     <img 
//       src={src} 
//       alt={alt} 
//       style={{ width: '20px', height: '15px'}}
//     />
//   )

//   return (
//     <div className="language-switcher">
//       <div className="lang-but flex gap-2 items-center">        
//         <button onClick={() => changeLanguage('en')}>🇬🇧 English</button>
//         <button onClick={() => changeLanguage('es')}>🇪🇸 Español</button>

//         <button 
//           onClick={() => changeLanguage('ca')} 
//           className="cat">
//           <FlagIcon src={cataloniaFlag} alt="Català" />
//           <span className="leading-none pb-[2px]"> Català</span>
//         </button>
//         <button onClick={() => changeLanguage('fr')}>🇫🇷 Français</button>
//       </div>
//     </div>
//   );
// }