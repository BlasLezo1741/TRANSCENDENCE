
type InfoProps = {
    dispatch: React.Dispatch<any>;
    option: string;
};

const InfoScreen = ({dispatch, option}: InfoProps) =>
{
    return (
        <section>
            <h1>{option}</h1>
        </section>
    );
};

export default InfoScreen;