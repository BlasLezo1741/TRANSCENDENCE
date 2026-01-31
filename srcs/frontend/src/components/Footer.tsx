import type { ScreenProps } from '../ts/screenConf/screenProps';
import '../css/Footer.css';

/* 

Footer

    - Privacy Policy
    - Terms of service
    - Informacion
    - Politica de cookies
    - Soporte/Contacto

*/

type FooterProps = {
    dispatch: React.Dispatch<any>;
    setOption: React.Dispatch<React.SetStateAction<string>>;
};

const FooterCont = ({dispatch, setOption}: FooterProps) =>
{
    const changeScreen = (option: string) =>
    {
        setOption(option);
        dispatch({ type: "INFO" });
    };

    return (
        <div className="foot-cont">
            <a href="#" onClick={() => changeScreen("1")}>
                Opcion 1
            </a>
            <hr />
            <a href="#" onClick={() => changeScreen("2")}>
                Opcion 2
            </a>
            <hr />
            <a href="#" onClick={() => changeScreen("3")}>
                Opcion 3
            </a>
        </div>
    );
}

const Footer = ({dispatch, setOption}: FooterProps) =>
{
    return (
        <footer>
            <FooterCont dispatch={dispatch} setOption={setOption}/>
        </footer>
    );
};

export default Footer;