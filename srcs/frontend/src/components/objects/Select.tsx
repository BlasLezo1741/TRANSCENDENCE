import { ReactNode } from 'react';

type Option =
{
    value: string;
    label: ReactNode;
};

type SelectProps =
{
    id?: string;
    value?: string;
    options: Option[];
    onChange?: (value: string) => void;
    required?: boolean;
    disabled?: boolean;
};

const selectCss = "text-black";

const Select = ({id, value, options, onChange = () => {}, required = false, 
                disabled = false}: SelectProps) =>
{
    return (
        <select id={id} name={id} value={value} required={required} disabled={disabled}
            className={selectCss} onChange={(e) => onChange(e.target.value)}
        >
            {options.map((opt) => (
                <option key={String(options.value)} value={options.value}>
                    {opt.label}
                </option>
            ))}
        </select>
    );
};

export default Select;