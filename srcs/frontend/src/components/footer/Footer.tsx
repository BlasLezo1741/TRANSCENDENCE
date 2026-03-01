import { useTranslation } from 'react-i18next';
import '../../css/Footer.css';

type FooterProps = {
    dispatch: React.Dispatch<any>;
    setOption: React.Dispatch<React.SetStateAction<string>>;
};

const FooterCont = ({dispatch, setOption}: FooterProps) =>
{
    const { t } = useTranslation();
    const changeScreen = (option: string) =>
    {
        setOption(option);
        dispatch({ type: "INFO" });
    };

    return (
        <div className="foot-cont">
            <a href="#" onClick={() => changeScreen("a")}>
                {t('info.privacy_policy')}
            </a>
            <hr />
            <a href="#" onClick={() => changeScreen("b")}>
                {t('info.terms_of_service')}
            </a>
            <hr />
            <a href="#" onClick={() => changeScreen("c")}>
                {t('info.about_project')}
            </a>
            <hr />
            <a href="#" onClick={() => changeScreen("d")}>
                {t('info.contact')}
            </a>
            <hr />
            <a href="#" onClick={() => changeScreen("e")}>
                {t('info.credits')}
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