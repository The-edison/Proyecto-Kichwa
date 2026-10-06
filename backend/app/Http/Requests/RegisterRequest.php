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
        $this->merge(['email' => mb_strtolower(trim((string) $this->input('email'))),
            'name' => trim((string) $this->input('name'))]);
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
            'name' => ['required', 'string', 'min:2', 'max:150', "regex:/^[\\p{L}\\p{M}]+(?:[ '\\-][\\p{L}\\p{M}]+)*$/u"],
            'email' => ['required', 'string', 'max:254', config('kichwa.check_dns') && ! app()->environment('testing') ? 'email:rfc,dns' : 'email:rfc', 'unique:usuarios,correo_usuario',
                function ($attribute, $value, $fail) {
                    if (in_array(strtolower(substr(strrchr($value, '@') ?: '', 1)), ['mailinator.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com'], true)) {
                        $fail('Utiliza un correo permanente.');
                    }
                }],
            'cedula' => ['nullable', 'string', 'digits:10', 'unique:usuarios,cedula_usuario', function ($attribute, $value, $fail) {
                if (! preg_match('/^[0-9]{10}$/', $value)) {
                    return;
                }
                $province = (int) substr($value, 0, 2);
                $sum = 0;
                for ($i = 0; $i < 9; $i++) {
                    $digit = (int) $value[$i] * ($i % 2 === 0 ? 2 : 1);
                    $sum += $digit > 9 ? $digit - 9 : $digit;
                }
                if (! ($province >= 1 && $province <= 24 || $province === 30) || (int) $value[2] >= 6 || (10 - $sum % 10) % 10 !== (int) $value[9]) {
                    $fail('La cédula ecuatoriana no es válida.');
                }
            }],
            'password' => ['required', 'confirmed', self::passwordRule()],
            'role' => ['prohibited'], 'role_id' => ['prohibited'], 'rol_usuario' => ['prohibited'],
            'estado_usuario' => ['prohibited'],
        ];
    }

    public function messages(): array
    {
        return ['required' => 'El campo :attribute es obligatorio.', 'name.regex' => 'Escribe un nombre con letras, espacios, guiones o apóstrofes.',
            'email.email' => 'Ingresa un correo válido con un dominio existente.', 'unique' => 'Este :attribute ya está registrado.',
            'password.confirmed' => 'Las contraseñas no coinciden.', 'password.min' => 'Usa al menos 12 caracteres.',
            'prohibited' => 'No puedes asignar :attribute.', 'cedula.digits' => 'La cédula debe tener 10 dígitos.'];
    }
}
