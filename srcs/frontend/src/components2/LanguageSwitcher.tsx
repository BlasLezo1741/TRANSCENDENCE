import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef } from 'react';
import cataloniaFlag from '../assets/Flag_of_Catalonia.png';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [activeLanguage, setActiveLanguage] = useState(i18n.language);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveLanguage(i18n.language);
  }, [i18n.language]);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setActiveLanguage(lng);
    setOpen(false);
  };

  const FlagIcon = ({ src, alt }: { src: string; alt: string }) => (
    <img 
      src={src} 
      alt={alt} 
      style={{ width: '20px', height: '15px' }} // proporción rectangular
    />
  );

  const getLanguageDisplay = (lng: string) =>
  {
    switch (lng)
    {
      case 'en':
        return <>🇬🇧 English</>;
      case 'es':
        return <>🇪🇸 Español</>;
      case 'ca':
        return (
          <>
            <FlagIcon src={cataloniaFlag} alt="Català" />
            <span> Català</span>
          </>
        );
      case 'fr':
        return <>🇫🇷 Français</>;
      default:
        return lng;
    }
  };

  useEffect(() =>
  {
      const handleClicks = (event: MouseEvent) =>
      {
          if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node))
              setOpen(false);
      };

      document.addEventListener("mousedown", handleClicks);

      return () =>
      {
          document.removeEventListener("mousedown", handleClicks)
      };
  }, []);

  return (
    <div className="language-switcher" ref={dropdownRef}>

      <button className="dropdown-btn" onClick={() => setOpen(!open)}>
        {getLanguageDisplay(activeLanguage)}
      </button>

      <div className={`lang-but ${open ? 'show' : ''}`}>        
        <button
          onClick={() => changeLanguage('en')}
          className={activeLanguage === 'en' ? 'lang-sel' : ''}>
          {getLanguageDisplay('en')}
        </button>

        <button
          onClick={() => changeLanguage('es')}
          className={activeLanguage === 'es' ? 'lang-sel' : ''}>
          {getLanguageDisplay('es')}
        </button>

        <button
          onClick={() => changeLanguage('ca')}
          className={`cat ${activeLanguage === 'ca' ? 'lang-sel' : ''}`}>
          {getLanguageDisplay('ca')}
        </button>

        <button
          onClick={() => changeLanguage('fr')}
          className={activeLanguage === 'fr' ? 'lang-sel' : ''}>
          {getLanguageDisplay('fr')}
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