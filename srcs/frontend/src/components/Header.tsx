import { LanguageSwitcher } from '../components/LanguageSwitcher';
import type { ScreenProps } from '../ts/screenConf/screenProps';

function Header({dispatch}: ScreenProps)
{
    return (
        <header>
            <h1></h1>
            <LanguageSwitcher />

            <button onClick={() => dispatch({ type: "LOGIN" })}>
                SignIn
            </button>
        </header>
    );
}

export default Header;