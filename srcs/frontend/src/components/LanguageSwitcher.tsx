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
    // Mark that the user made a manual choice this session.
    // App.tsx reads this flag in syncProfile to skip overwriting with the DB language
    // on page refresh. The flag is cleared on logout so the next login resets to the
    // user's DB language again.
    sessionStorage.setItem('languageManuallySet', 'true');
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
      className="relative inline-block absolute top-1/2 left-1/2 -translate-x-1/2 z-[1000]"
      ref={dropdownRef}
    >
      {/* Botón desplegable solo visible en móvil */}
      <button
        className="btn bg-gray-200 text-black block lg:hidden"
        onClick={() => setOpen(!open)}
      >
        {getLanguageDisplay(activeLanguage)}
      </button>

      {/* Botones de idioma */}
      <div
        className={`
          ${open ? 'flex' : 'hidden'}
          lg:flex
          flex-col lg:flex-row
          absolute lg:static
          top-full left-1/2 lg:left-auto
          -translate-x-1/2 lg:translate-x-0
          shadow-lg lg:shadow-none
          z-10 lg:z-auto
          border bg-[rgb(0,0,42)] lg:border-none
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
                  ? 'btn bg-gray-200 text-black cursor-default'
                  : 'btn bg-gray-400 text-black hover:bg-black hover:text-white cursor-pointer'
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