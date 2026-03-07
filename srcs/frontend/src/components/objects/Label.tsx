import { ReactNode } from "react";

type LabelProps =
{
    htmlFor?: string;
    children: ReactNode;
};

const labelCss = "text-black";

const Label = ( {htmlFor, children}: LabelProps ) => 
{
    return (
        <label
            htmlFor={htmlFor}
            className={labelCss}
        >
            {children}
        </label>
    );
};

export default Label;