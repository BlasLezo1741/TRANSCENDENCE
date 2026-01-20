import { useState, useEffect, useRef } from 'react';
import { LanguageSwitcher } from '../LanguageSwitcher';
import avatarUrl from '../../assets/react.svg'
import './Header.css';
import { useTranslation } from 'react-i18next';

type HeaderProps = {
    dispatch: React.Dispatch<any>;
    userName: string;
    onLogout: () => void; // <--- NUEVO: Recibimos la función de limpieza desde el padre
};

const Header = ({dispatch, userName, onLogout}: HeaderProps) =>
{
    //const [signed, setSigned] = useState(true);
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef(null);
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
/*
    const handleSignout = () =>
    {
        setSigned(false);
    };
*/
/*
    const handleLogout = () => {
        // Clear localStorage
        localStorage.removeItem("pong_user_nick");
        // Dispatch logout action
        dispatch({ type: "LOGOUT" });
    };
*/
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

//     return (
//         <header>
//             <div className="home" onClick={() => dispatch({type: "MENU"})}>
//                 <img src={avatarUrl} alt={userName} />
//                 <p className="letters">Okinawa</p>
//             </div>
            
//             <LanguageSwitcher />

//             <div className="signin">

//                 {/* Is not logged */}
//                 {!signed && (
//                     <button onClick={() => dispatch({ type: "LOGIN" })}>
//                         Login
//                     </button>
//                     /*
//                     <button onClick={() => dispatch({ type: "SIGN" })}>
//                         {t('crear_cuenta')}
//                     </button>
//                     */
//                 )}

//                 {/* Is logged */}
//                 {signed && (
//                     <div className="login" ref={dropdownRef} onClick={() => setOpen(!open)}>
                        
//                         <img className="avatarIcon" src={avatarUrl} alt={userName} />
//                         <p className="letters"><strong>{userName}</strong></p>

//                     {/* Dropdown */}
//                     {open && (
//                         <ul className="dropdown">
//                             <li><a href="#" onClick={handleProfile}>Profile</a></li>
//                             <li><a href="#" onClick={handleSettings}>Settings</a></li>
//                             <li><a href="#" onClick={handleStats}>Stats</a></li>
//                             <li><a href="#" onClick={handleLogout}>Sign out</a></li>
//                         </ul>
//                     )} 
//                     </div>
//                 )}
//             </div>
//         </header>
//     );
// }
    return (
        <header>
            <div className="home" onClick={() => dispatch({ type: "MENU" })}>
                <img src={avatarUrl} alt="Logo" />
                <p className="letters">Okinawa</p>
            </div>
            
            <LanguageSwitcher />

            <div className="signin">
                {/* ESTADO: NO LOGUEADO */}
                {!isLogged && (
                    <button onClick={() => dispatch({ type: "LOGIN" })}>
                        Login
                    </button>
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
                                <li><a href="#" onClick={handleSettings}>Settings</a></li>
                                <li><a href="#" onClick={handleStats}>Stats</a></li>
                                <li><a href="#" onClick={handleLogoutClick}>Sign out</a></li>
                            </ul>
                        )} 
                    </div>
                )}
            </div>
        </header>
    );
    }
export default Header;