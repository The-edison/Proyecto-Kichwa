<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $normalized = [];
        foreach (['first_name', 'last_name', 'email', 'cedula'] as $field) {
            $value = $this->input($field);
            if (is_string($value)) {
                $normalized[$field] = in_array($field, ['first_name', 'last_name'], true)
                    ? preg_replace('/\s+/u', ' ', trim($value))
                    : trim($value);
            }
        }
        if (isset($normalized['email'])) {
            $normalized['email'] = mb_strtolower($normalized['email']);
        }
        $this->merge($normalized);
    }

    public static function passwordRule(): Password
    {
        $rule = Password::min(12)->max(72)->letters()->mixedCase()->numbers()->symbols()->rules([
            function ($attribute, $value, $fail): void {
                if (! is_string($value) || strlen($value) > 72 || str_contains($value, "\0")) {
                    $fail('La contraseña debe tener como máximo 72 bytes y no contener caracteres nulos.');
                }
            },
        ]);
        if (config('kichwa.check_breached_passwords') && ! app()->environment('testing')) {
            $rule->uncompromised();
        }

        return $rule;
    }

    public function rules(): array
    {
        return [
            'first_name' => ['bail', 'required', 'string', 'min:2', 'max:74', 'regex:/^\p{L}[\p{L}\p{M}]*(?: \p{L}[\p{L}\p{M}]*)*$/u'],
            'last_name' => ['bail', 'required', 'string', 'min:2', 'max:74', 'regex:/^\p{L}[\p{L}\p{M}]*(?: \p{L}[\p{L}\p{M}]*)*$/u'],
            'email' => ['bail', 'required', 'string', 'max:254', config('kichwa.check_dns') && ! app()->environment('testing') ? 'email:rfc,dns' : 'email:rfc', 'unique:usuarios,correo_usuario',
                function ($attribute, $value, $fail) {
                    if (in_array(strtolower(substr(strrchr($value, '@') ?: '', 1)), ['mailinator.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com'], true)) {
                        $fail('Utiliza un correo permanente.');
                    }
                }],
            'cedula' => ['bail', 'nullable', 'string', 'regex:/^[0-9]{10}$/', 'unique:usuarios,cedula_usuario', function ($attribute, $value, $fail) {
                if (! preg_match('/^[0-9]{10}$/', $value)) {
                    return;
                }
                $province = (int) substr($value, 0, 2);
                $sum = 0;
                for ($i = 0; $i < 9; $i++) {
                    $digit = (int) $value[$i] * ($i % 2 === 0 ? 2 : 1);
                    $sum += $digit > 9 ? $digit - 9 : $digit;
                }
                if (! ($province >= 1 && $province <= 24 || $province === 30)) {
                    $fail('La cédula debe comenzar con un código del 01 al 24 o 30.');
                } elseif ((int) $value[2] >= 6) {
                    $fail('El tercer dígito de la cédula debe estar entre 0 y 5.');
                } elseif ((10 - $sum % 10) % 10 !== (int) $value[9]) {
                    $fail('El dígito verificador de la cédula no es correcto. Revisa el número.');
                }
            }],
            'password' => ['bail', 'required', 'string', self::passwordRule()],
            'password_confirmation' => ['bail', 'required', 'string', 'max:72', 'same:password'],
            'role' => ['prohibited'], 'role_id' => ['prohibited'], 'rol_usuario' => ['prohibited'],
            'estado_usuario' => ['prohibited'],
        ];
    }

    public function messages(): array
    {
        return ['required' => 'El campo :attribute es obligatorio.', 'string' => 'El campo :attribute debe ser un texto.',
            'first_name.regex' => 'Los nombres solo pueden contener letras y espacios.', 'last_name.regex' => 'Los apellidos solo pueden contener letras y espacios.',
            'first_name.min' => 'Escribe al menos 2 caracteres en nombres.', 'last_name.min' => 'Escribe al menos 2 caracteres en apellidos.',
            'first_name.max' => 'Los nombres no pueden superar los 74 caracteres.', 'last_name.max' => 'Los apellidos no pueden superar los 74 caracteres.',
            'email.email' => 'Ingresa un correo válido con un dominio existente.', 'unique' => 'Este :attribute ya está registrado.',
            'password_confirmation.same' => 'Las contraseñas no coinciden.', 'password.min' => 'Usa al menos 12 caracteres.',
            'password.max' => 'La contraseña no puede superar los 72 caracteres.',
            'password.mixed' => 'Incluye mayúsculas y minúsculas en la contraseña.',
            'password.letters' => 'Incluye letras en la contraseña.', 'password.numbers' => 'Incluye números en la contraseña.',
            'password.symbols' => 'Incluye un símbolo en la contraseña.',
            'prohibited' => 'No puedes asignar :attribute.', 'cedula.regex' => 'La cédula debe contener exactamente 10 dígitos del 0 al 9.'];
    }

    public function attributes(): array
    {
        return ['first_name' => 'nombres', 'last_name' => 'apellidos', 'email' => 'correo electrónico',
            'cedula' => 'cédula', 'password' => 'contraseña', 'password_confirmation' => 'confirmación de contraseña'];
    }
}
