import type { ScreenProps } from '../ts/screenConf/screenProps';
import '../css/Footer.css';

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
            <a href="#" onClick={() => changeScreen("a")}>
                Politica de privacidad
            </a>
            <hr />
            <a href="#" onClick={() => changeScreen("b")}>
                Terminos de servicio
            </a>
            <hr />
            <a href="#" onClick={() => changeScreen("c")}>
                Sobre el proyecto
            </a>
            <hr />
            <a href="#" onClick={() => changeScreen("d")}>
                Contacto
            </a>
            <hr />
            <a href="#" onClick={() => changeScreen("e")}>
                Creditos
            </a>
            <hr />
            <a href="https://github.com/BlasLezo1741/TRANSCENDENCE" target="new">
                Github
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