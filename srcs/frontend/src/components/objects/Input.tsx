type InputProps = {
  id?: string;
  value?: string;
  onChange?: (value: string) => void;
  type?: string;
  placeholder?: string;
  pattern?: string;
  maxLength?: number;
  autoFocus?: boolean;
  required?: boolean;
  title?: string;
  checked?: boolean;
};

const inputCss = "text-black";

const Input = 
({
    id, value, type = "text", onChange = () => {},
    placeholder, pattern, maxLength, autoFocus,
    required = true, title, checked
}: InputProps) => {
  return (
    <input
      className={inputCss}
      id={id}
      name={id}
      type={type}
      value={value}
      placeholder={placeholder}
      pattern={pattern}
      checked={checked}
      maxLength={maxLength}
      autoFocus={autoFocus}
      required={required}
      title={title}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
    />
  );
};

export default Input;