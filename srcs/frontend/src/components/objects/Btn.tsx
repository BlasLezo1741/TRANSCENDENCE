type BtnProps =
{
    msg: string;
    className?: "default" | "normal" | "sent" | "del" | "return" | "accept" | "reject";
    type?: "button" | "reset" | "submit";
    disabled?: boolean;
    onClick?: () => void;
};

const BtnStyles =
{
    default: "",
    return: "bg-gray-800 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-700 active:bg-gray-600 transition-colors duration-200 shadow-md",
    normal: "bg-gray-800 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-700 active:bg-gray-600 transition-colors duration-200 shadow-md",
    accept: "bg-gray-800 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-700 active:bg-gray-600 transition-colors duration-200 shadow-md",
    reject: "bg-gray-800 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-700 active:bg-gray-600 transition-colors duration-200 shadow-md",
    sent: "bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-500 active:bg-green-700 transition-colors duration-200 shadow-md",
    del: "bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-500 active:bg-red-700 transition-colors duration-200 shadow-md",
};

const Btn = ({ msg, className = "default", type = "button", disabled, onClick = () => {} }: BtnProps) =>
{
    return (
        <button
            className={BtnStyles[className]}
            onClick={onClick}
            type={type}
            disabled={disabled}
        >
            {msg}
        </button>
    );
};

export default Btn;