import { useState, useEffect, useRef } from 'react';
import { LanguageSwitcher } from './LanguageSwitcher';
import noAvatarUrl from '../assets/nouser_chatgpt.png';
import homeIcon from '../assets/Home_chatgpt.png';
import { useTranslation } from 'react-i18next';
import { StatusBadge } from './StatusBadge'; // Importamos el nuevo badge
import { Avatar } from './Avatar';

type HeaderProps = {
    dispatch: React.Dispatch<any>;
    setIa: React.Dispatch<React.SetStateAction<boolean>>;
    userName: string;
    userId?: number;
    userAvatarUrl?: string | null;
    profileSynced: boolean;
    onLogout: () => void; // <--- NUEVO: Recibimos la función de limpieza desde el padre
};

const Header = ({dispatch, setIa, userName, userId, userAvatarUrl, profileSynced, onLogout}: HeaderProps) =>
{

    const [signed, setSigned] = useState(true);
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef(null);
    //const [signed, setSigned] = useState(true);
    const { t } = useTranslation();

    // Variable derivada: Si hay nombre, está logueado. Si no, no.
    const isLogged = !!userName;

    const handleProfile = () =>
    {
        dispatch({ type: "PROFILE" });
    };

    const handleSettings = () =>
    {
        dispatch({ type: "SETTINGS" });
    };

    const handleStats = () =>
    {
        dispatch({ type: "STATS" });
    };

    const handleLogoutClick = (e: React.MouseEvent) => {
        e.preventDefault(); // Evitar comportamiento de enlace #
        setOpen(false);
        onLogout(); // <--- Llamamos a la función potente de App.tsx
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
        <>
            <StatusBadge />
            <header>
                <div className="home w-[160px]" onClick={() => { setIa(false); dispatch({ type: "MENU" });}}>
                    <img src={homeIcon} alt="Logo" className="w-[50px] h-[50px]"/>
                    <p className="ml-1">Okinawa</p>
                </div>
                
                <div className="w-[420px]">
                     <LanguageSwitcher />
                </div>

                <div className="w-[160px] flex justify-end">
                    {/* ESTADO: NO LOGUEADO */}
                    {!isLogged && (
                        <div className="home" ref={dropdownRef} onClick={() => dispatch({ type: "LOGIN" })}>
                            <img className="w-[50px] h-[50px]" src={noAvatarUrl} alt="Local" />
                            <p className="ml-1"><strong>{t('init_ses')}</strong></p>
                        </div>
                    )}

                    {/* ESTADO: LOGUEADO */}
                    {isLogged && (
                        <div className="home relative" ref={dropdownRef} onClick={() => setOpen(!open)}>
                            
                            {profileSynced
                                ? <Avatar
                                    src={userAvatarUrl}
                                    userId={userId ?? 0}
                                    size={36}
                                    alt={userName}
                                  />
                                : <div className="w-[36px] h-[36px] rounded-full bg-gray-300"/>
                            }
                            <p className="ml-1"><strong>{userName}</strong></p>

                            {/* Dropdown */}
                            {open && (
                                <ul className="dropdown">
                                    <li><a href="#" onClick={handleProfile}>{t('profile')}</a></li>
                                    <li><a href="#" onClick={handleLogoutClick}>{t('logout')}</a></li>
                                </ul>
                            )} 
                        </div>
                    )}
                </div>
            </header>
        </>
    );
}
     
export default Header;