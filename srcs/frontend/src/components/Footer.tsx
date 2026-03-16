// import type { ScreenProps } from '../ts/screenConf/screenProps'; // Handled differently
import type { States } from '../screens/InfoScreen.tsx';
import { useTranslation } from 'react-i18next';

type FooterProps = {
    dispatch: React.Dispatch<any>;
    setOption: React.Dispatch<React.SetStateAction<States>>;
};

const FooterCont = ({ dispatch, setOption }: FooterProps) => {
  const { t } = useTranslation();

  const changeScreen = (option: States) => {
    setOption(option);
    dispatch({ type: "INFO" });
  };

  return (
    <div className="w-full h-[100px] text-white bg-[#00002A] flex justify-center items-center">
      <div className="w-[70%] flex flex-row flex-wrap justify-center items-center gap-x-5">
        <a
          href="#"
          onClick={() => changeScreen("a")}
          className="text-white hover:underline"
        >
          {t("info.privacy_policy")}
        </a>
        <hr className="mx-5 border-white h-[1px]" />
        <a
          href="#"
          onClick={() => changeScreen("b")}
          className="text-white hover:underline"
        >
          {t("info.terms_of_service")}
        </a>
        <hr className="mx-5 border-white h-[1px]" />
        <a
          href="#"
          onClick={() => changeScreen("c")}
          className="text-white hover:underline"
        >
          {t("info.about_project")}
        </a>
        <hr className="mx-5 border-white h-[1px]" />
        <a
          href="#"
          onClick={() => changeScreen("d")}
          className="text-white hover:underline"
        >
          {t("info.contact")}
        </a>
        <hr className="mx-5 border-white h-[1px]" />
        <a
          href="#"
          onClick={() => changeScreen("e")}
          className="text-white hover:underline"
        >
          {t("info.credits")}
        </a>
        <hr className="mx-5 border-white h-[1px]" />
        <a
          href="https://github.com/BlasLezo1741/TRANSCENDENCE"
          target="_blank"
          className="text-white hover:underline"
        >
          Github
        </a>
      </div>
    </div>
  );
};

const Footer = ({ dispatch, setOption }: FooterProps) => {
  return <footer><FooterCont dispatch={dispatch} setOption={setOption} /></footer>;
};

export default Footer;