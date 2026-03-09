import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef } from 'react';
import cataloniaFlag from '../../assets/Flag_of_Catalonia.png';

import Btn from '../objects/Btn.tsx';
import Image from '../objects/Image.tsx';

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
    <Image 
      src={src} 
      alt={alt} 
      /* style={{ width: '20px', height: '15px' }} */
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
      <Btn
        msg={getLanguageDisplay(activeLanguage)}
        onClick={() => setOpen(!open)}
        /* className='dropdown-btn' */
      />
      <div className={`lang-but ${open ? 'show' : ''}`}>
        <Btn
          msg={getLanguageDisplay('en')}
          onClick={() => changeLanguage('en')}
          active={activeLanguage === 'en'}
          /* className='lang-sel' */
        />
        <Btn
          msg={getLanguageDisplay('es')}
          onClick={() => changeLanguage('es')}
          active={activeLanguage === 'es'}
          /* className='lang-sel' */
        />
        <Btn
          msg={getLanguageDisplay('ca')}
          onClick={() => changeLanguage('ca')}
          active={activeLanguage === 'ca'}
          /* className='lang-sel' */
        />
        <Btn
          msg={getLanguageDisplay('fr')}
          onClick={() => changeLanguage('fr')}
          active={activeLanguage === 'fr'}
          /* className='lang-sel' */
        />
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