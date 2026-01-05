import type { ScreenProps } from "../ts/screenConf/screenProps"

const SignScreen = ({ dispatch }: ScreenProps) =>
{
    const tmp = () =>
    {
        dispatch({type: "MENU"});
    }

    return (
        <div>
            {tmp()}
        </div>
    );
};

export default SignScreen;