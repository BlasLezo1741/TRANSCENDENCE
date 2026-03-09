import { ReactNode } from 'react';

type LiProps =
{
    children: React.ReactNode;
    active: boolean;
    onClick?: () => void;
};

const liCss = "";
const selectedLi = ""

const Li = ({children, active = false, onClick }: LiProps) =>
{
    return (
        <li
            className={ active ? selectedLi : liCss }
            onClick={onClick}
        >
            {children}
        </li>
    );
};

export default Li;