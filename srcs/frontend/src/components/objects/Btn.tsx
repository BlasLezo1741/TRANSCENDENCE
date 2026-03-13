import { ReactNode } from 'react';

type BtnProps =
{
    msg: React.ReactNode;
    variant?: "default" | "linkG" | "linkB" | "sent" | "del" | "return" | "accept" | "cancel";
    extraClasses?: string;
    type?: "button" | "reset" | "submit";
    disabled?: boolean;
    onClick?: () => void;
    title?: string;
    active?: boolean
};

const BtnStyles =
{
    default: "bg-gray-800 text-white border border-gray-600 hover:bg-gray-700 focus:ring-purple-400",
    accept: "bg-green-500 text-black hover:bg-green-400 focus:ring-green-400",
    del: "bg-red-600 text-white hover:bg-red-500 focus:ring-red-400",
    linkG: "inline-block bg-green-500 text-black hover:bg-green-400 focus:ring-green-400",
    linkB: "inline-block bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-400 hover:to-purple-500 focus:ring-purple-400",
    sent: "bg-green-500 text-black hover:bg-green-400 focus:ring-green-400",
    cancel: "bg-red-500 text-white hover:bg-red-400 focus:ring-red-400",
    return: "inline-flex items-center gap-2 bg-gray-800 text-white border border-gray-600 hover:bg-gray-700 hover:border-purple-400 focus:ring-purple-400",
};

const baseCss = "px-4 py-2 rounded-lg font-semibold transition focus:outline-none focus:ring-2";

const Btn = ({ msg, variant = "default", extraClasses = "", type = "button", disabled, onClick = () => {}, title, active = true }: BtnProps) =>
{
    return (
        <button
            className={`${baseCss} ${extraClasses} ${ active ? BtnStyles[variant] : ""}`}
            onClick={onClick}
            type={type}
            disabled={disabled}
            title={title}
        >
            {msg}
        </button>
    );
};

export default Btn;