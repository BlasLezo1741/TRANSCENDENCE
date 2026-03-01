type ImageBtnProps =
{
    src: Object;
    alt: string;
    onClick?: () => void;
};

const ImageBtnStyles = "w-[150px] h-[200px] mx-2.5 cursor-pointer";

const ImageBtn = ({ src, alt, onClick = () => {} }: ImageBtnProps) =>
{
    return (
        <img
            className={ImageBtnStyles}
            src={src}
            alt={alt}
            onClick={onClick}
        />
    );
};

export default ImageBtn;