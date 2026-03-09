import type { CSSProperties } from "react";

type ImageProps =
{
    src: string;
    alt: string;
    className?: "default" | "btnDiff" | "bg" | "itemLow" | "itemMid" | "avatar" ;
    extraClass?: string;
    style?: React.CSSProperties;
    onClick?: () => void;
    onLoadStart?: () => void;
    onLoad?: () => void;
    onError?: () => void;
};

const ImageStyles =
{
    default: "",
    bg: "",
    itemLow: "w-[30px] h-[30px]",
    itemMid: "w-[50px] h-[50px]",
    btnDiff: "w-[150px] h-[200px] mx-2.5 cursor-pointer",
    avatar: "w-[40px] h-[40px] rounded-full overflow-hidden border-2 border-gray-300 object-cover",
};

const Image = ({ src, alt, className = "default", extraClass, style, onClick = () => {}, onLoad = () => {}, onLoadStart = () => {}, onError = () => {} }: ImageProps) =>
{
    return (
        <img
            className={`${ImageStyles[className]} ${extraClass}`}
            style={style}
            src={src}
            alt={alt}
            onClick={onClick}
            onLoad={onLoad}
            onError={onError}
            onLoadStart={onLoadStart}
        />
    );
};

export default Image;