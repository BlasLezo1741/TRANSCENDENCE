type LabelProps =
{
    htmlFor: string;
    msg: string;
};

const labelCss = "";

const Label = ( {htmlFor, msg}: LabelProps ) => 
{
    return (
        <label
            htmlFor={htmlFor}
            className={labelCss}
        >
            {msg}
        </label>
    );
};

export default Label;