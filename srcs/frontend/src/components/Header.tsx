import { useState, useEffect, useRef } from 'react';
import { LanguageSwitcher } from './LanguageSwitcher';
import avatarUrl from '../assets/react.svg';
import noAvatarUrl from '../assets/nouser_chatgpt.png';
import homeIcon from '../assets/Home_chatgpt.png';
import { useTranslation } from 'react-i18next';
import { StatusBadge } from './StatusBadge'; // Importamos el nuevo badge
import '../css/Header.css';

type HeaderProps = {
    dispatch: React.Dispatch<any>;
    userName: string;
    onLogout: () => void; // <--- NUEVO: Recibimos la función de limpieza desde el padre
};

const Header = ({dispatch, userName, onLogout}: HeaderProps) =>
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
            <header style={{ position: 'relative', zIndex: 50 }}>
                <div className="home" onClick={() => dispatch({ type: "MENU" })}>
                    <img src={homeIcon} alt="Logo" />
                    <p className="letters">Okinawa</p>
                </div>
                
                <div>
                     <LanguageSwitcher />

                </div>

                <div className="signin">
                    {/* ESTADO: NO LOGUEADO */}
                    {!isLogged && (
                        // <button onClick={() => dispatch({ type: "LOGIN" })}>
                        //     Login
                        // </button>
                        <div className="login" ref={dropdownRef} onClick={() => dispatch({ type: "LOGIN" })}>
                            <img className="avatarIcon" src={noAvatarUrl} alt="Local" />
                            <p className="letters"><strong>Login</strong></p>
                        </div>
                    )}

                    {/* ESTADO: LOGUEADO */}
                    {isLogged && (
                        <div className="login" ref={dropdownRef} onClick={() => setOpen(!open)}>
                            
                            <img className="avatarIcon" src={avatarUrl} alt={userName} />
                            <p className="letters"><strong>{userName}</strong></p>

                            {/* Dropdown */}
                            {open && (
                                <ul className="dropdown">
                                    <li><a href="#" onClick={handleProfile}>Profile</a></li>
                                    <li><a href="#" onClick={handleLogoutClick}>Sign out</a></li>
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