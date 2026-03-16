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
      className="w-[20px] h-[15px] inline-block"
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
    <div
      className="relative inline-block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1000]"
      ref={dropdownRef}
    >
      {/* Botón desplegable solo visible en móvil */}
      <button
        className="block md:hidden cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        {getLanguageDisplay(activeLanguage)}
      </button>

      {/* Botones de idioma */}
      <div
        className={`
          ${open ? 'flex' : 'hidden'}
          md:flex
          flex-col md:flex-row    /* Vertical en móvil, horizontal en desktop */
          absolute md:static
          top-full left-1/2 md:left-auto
          -translate-x-1/2 md:translate-x-0
          shadow-md md:shadow-none
          z-10 md:z-auto
          bg-white border md:border-none
          min-w-max
        `}
      >
        {['en', 'es', 'ca', 'fr'].map((lang) => {
          const isActive = activeLanguage === lang;
          return (
            <button
              key={lang}
              onClick={() => changeLanguage(lang)}
              className={`
                ${isActive
                  ? 'bg-white text-black cursor-default'
                  : 'bg-gray-400 text-black hover:bg-black hover:text-white cursor-pointer'
                }
              `}
            >
              {getLanguageDisplay(lang)}
            </button>
          );
        })}
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