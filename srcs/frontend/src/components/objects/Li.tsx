type LiProps =
{
    label: string;
    active: boolean;
    onClick?: () => void;
};

const liCss = "";
const selectedLi = ""

const Li = ({label, active, onClick }: LiProps) =>
{
    return (
        <li
            className={ active ? selectedLi : liCss }
            onClick={onClick}
        >
            {label}
        </li>
    );
};

export default Li;