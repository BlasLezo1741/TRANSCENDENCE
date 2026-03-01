type BtnProps =
{
    msg: string;
    type?: "default" | "normal" | "sent" | "del";
    onClick?: () => void;
};

const BtnStyles =
{
    default: "",
    normal: "bg-gray-800 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-700 active:bg-gray-600 transition-colors duration-200 shadow-md",
    sent: "bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-500 active:bg-green-700 transition-colors duration-200 shadow-md",
    del: "bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-500 active:bg-red-700 transition-colors duration-200 shadow-md",
};

const Btn = ({ msg, type = "default", onClick = () => {} }: BtnProps) =>
{
    return (
        <button
            className={BtnStyles[type]}
            onClick={onClick}
        >
            {msg}
        </button>
    );
};

export default Btn;