import { LanguageSwitcher } from '../LanguageSwitcher';
import "./Header.css";
import { useTranslation } from 'react-i18next';

type HeaderProps = {
    dispatch: React.Dispatch<any>;
    userName: string;
};

const Header = ({dispatch, userName}: HeaderProps) =>
{
    {/*
    const handleUser = () =>
    {
        dispatch({ type: "LOGIN" });
    }
    */}

    const { t } = useTranslation();
    
    const handleLogout = () => {
        // Clear localStorage
        localStorage.removeItem("pong_user_nick");
        // Dispatch logout action
        dispatch({ type: "LOGOUT" });
    };
    return (
        <header>
            <h1></h1>
            <LanguageSwitcher />
            <button onClick={() => dispatch({type: "MENU"})}>
                Home/Icono
            </button>
            
            {/* Show Login/Sign buttons only when NOT logged in */}
            {!userName && (
                <>
                    <button onClick={() => dispatch({ type: "LOGIN" })}>
                        Login
                    </button>
                    <button onClick={() => dispatch({ type: "SIGN" })}>
                        {t('crear_cuenta')}
                    </button>
                </>
            )}
            
            {/* Show username and logout when logged in */}
            {userName && (
                <>
                    <a href="#" onClick={(e) => {e.preventDefault(); dispatch({ type: "MENU" });}}>
                        <strong>{userName}</strong>
                    </a>
                    <button onClick={handleLogout}>
                        {t('logout') || 'Logout'}
                    </button>
                </>
            )}
        </header>
    );
}

export default Header;
{/*
    return (
        <header>
            <h1></h1>
            <LanguageSwitcher />

            <button onClick={() => dispatch({type: "MENU"})}>
                Home/Icono
            </button>

            <button onClick={() => dispatch({ type: "LOGIN" })}>
                Login
            </button>
            
            <button onClick={() => dispatch({ type: "SIGN" })}>
                {t('crear_cuenta')}
            </button>

            <a href="#" onClick={(e) => {e.preventDefault(); handleUser();}}>
                <strong>{userName}</strong>
            </a>
        
        </header>
    );
}

export default Header;
*/}