import { LanguageSwitcher } from '../LanguageSwitcher';
import "./Header.css";
import { useTranslation } from 'react-i18next';

type HeaderProps = {
    dispatch: React.Dispatch<any>;
    userName: string;
};

const Header = ({dispatch, userName}: HeaderProps) =>
{
    const handleUser = () =>
    {
        dispatch({ type: "LOGIN" });
    }
    const { t } = useTranslation();

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