import { useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export function PasswordInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'>) {
    const [visible, setVisible] = useState(false);
    return <div className="relative">
        <input {...props} type={visible ? 'text' : 'password'} className="field pr-14" />
        <button type="button" className="absolute inset-y-0 right-1 grid min-h-11 w-11 place-items-center rounded-lg text-muted hover:text-forest"
            disabled={props.disabled} aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-pressed={visible} aria-controls={props.id} onClick={() => setVisible(!visible)}>
            {visible ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
        </button>
    </div>;
}
