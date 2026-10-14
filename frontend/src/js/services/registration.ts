export interface RegistrationData {
    first_name: string; last_name: string; cedula: string; email: string; password: string; password_confirmation: string;
}

export const normalizePersonName = (value: string) => value.trim().replace(/\s+/gu, ' ');

export function personNameError(value: string, label: string): string | undefined {
    const name = normalizePersonName(value);
    if (!name) return `Escribe tus ${label}.`;
    if (!/^\p{L}[\p{L}\p{M}]*(?: \p{L}[\p{L}\p{M}]*)*$/u.test(name)) return `Los ${label} solo pueden contener letras y espacios.`;
    if (Array.from(name).length < 2 || Array.from(name).length > 74) return `Escribe entre 2 y 74 caracteres en ${label}.`;
}

export function cedulaError(value: string): string | undefined {
    if (!value) return;
    if (!/^[0-9]{10}$/.test(value)) return 'La cédula debe contener exactamente 10 dígitos del 0 al 9.';
    const province = Number(value.slice(0, 2));
    if (!(province >= 1 && province <= 24 || province === 30)) return 'La cédula debe comenzar con un código del 01 al 24 o 30.';
    if (Number(value[2]) >= 6) return 'El tercer dígito de la cédula debe estar entre 0 y 5.';
    let sum = 0;
    for (let index = 0; index < 9; index++) {
        const digit = Number(value[index]) * (index % 2 === 0 ? 2 : 1);
        sum += digit > 9 ? digit - 9 : digit;
    }
    if ((10 - sum % 10) % 10 !== Number(value[9])) return 'El dígito verificador de la cédula no es correcto. Revisa el número.';
}

export function passwordChecks(password: string) {
    return {
        length: Array.from(password).length >= 12,
        mixed: /\p{Lu}/u.test(password) && /\p{Ll}/u.test(password),
        number: /\p{N}/u.test(password),
        symbol: /[\p{Z}\p{S}\p{P}]/u.test(password),
    };
}

export function passwordError(password: string): string | undefined {
    if (new TextEncoder().encode(password).length > 72 || password.includes('\0')) return 'La contraseña debe tener como máximo 72 bytes y no contener caracteres nulos.';
    if (!Object.values(passwordChecks(password)).every(Boolean)) return 'Usa al menos 12 caracteres, con mayúsculas, minúsculas, números y símbolos.';
}

export function registrationErrors(data: RegistrationData): Record<string, string> {
    const errors: Record<string, string> = {};
    const first = personNameError(data.first_name, 'nombres');
    const last = personNameError(data.last_name, 'apellidos');
    const cedula = cedulaError(data.cedula.trim());
    if (first) errors.first_name = first;
    if (last) errors.last_name = last;
    if (cedula) errors.cedula = cedula;
    const email = data.email.trim();
    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Ingresa un correo electrónico válido.';
    else if (['mailinator.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com'].includes(email.split('@')[1].toLowerCase())) errors.email = 'Utiliza un correo permanente.';
    const password = passwordError(data.password);
    if (password) errors.password = password;
    if (!data.password_confirmation) errors.password_confirmation = 'Confirma tu contraseña.';
    else if (data.password !== data.password_confirmation) errors.password_confirmation = 'Las contraseñas no coinciden.';
    return errors;
}
