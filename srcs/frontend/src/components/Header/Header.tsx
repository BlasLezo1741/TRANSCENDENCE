import { useState, useEffect, useRef } from 'react';
import { LanguageSwitcher } from '../LanguageSwitcher';
import avatarUrl from '../../assets/react.svg'
import './Header.css';

type HeaderProps = {
    dispatch: React.Dispatch<any>;
    userName: string;
};

const Header = ({dispatch, userName}: HeaderProps) =>
{
    const [signed, setSigned] = useState(true);
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef(null);

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

    const handleSignout = () =>
    {
        setSigned(false);
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
        <header>
            <div className="home" onClick={() => dispatch({type: "MENU"})}>
                <img src={avatarUrl} alt={userName} />
                <p className="letters">Okinawa</p>
            </div>
            
            <LanguageSwitcher />

            <div className="signin">

                {/* Is not logged */}
                {!signed && (
                    <button onClick={() => dispatch({ type: "LOGIN" })}>
                        Login
                    </button>
                )}

                {/* Is logged */}
                {signed && (
                    <div className="login" ref={dropdownRef} onClick={() => setOpen(!open)}>
                        
                        <img className="avatarIcon" src={avatarUrl} alt={userName} />
                        <p className="letters"><strong>{userName}</strong></p>

                    {/* Dropdown */}
                    {open && (
                        <ul className="dropdown">
                            <li><a href="#" onClick={handleProfile}>Profile</a></li>
                            <li><a href="#" onClick={handleSettings}>Settings</a></li>
                            <li><a href="#" onClick={handleStats}>Stats</a></li>
                            <li><a href="#" onClick={handleSignout}>Sign out</a></li>
                        </ul>
                    )} 
                    </div>
                )}
            </div>
        </header>
    );
}

export default Header;