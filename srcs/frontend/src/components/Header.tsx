import { LanguageSwitcher } from '../components/LanguageSwitcher';
import type { ScreenProps } from '../ts/screenConf/screenProps';

const Header = ({dispatch}: ScreenProps) =>
{
    return (
        <header>
            <h1></h1>
            <LanguageSwitcher />

            <button onClick={() => dispatch({type: "MENU"})}>
                Home
            </button>

            <button onClick={() => dispatch({ type: "LOGIN" })}>
                Login
            </button>
        </header>
    );
}

export default Header;