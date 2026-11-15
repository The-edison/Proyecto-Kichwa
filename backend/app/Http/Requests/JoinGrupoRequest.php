<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class JoinGrupoRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->rol_usuario === 'estudiante';
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'codigo' => ['required', 'string', 'regex:/^KCH-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('codigo'))) {
            $this->merge(['codigo' => strtoupper(trim($this->input('codigo')))]);
        }
    }

    public function messages(): array
    {
        return ['codigo.required' => 'Escribe el código de tu grupo.', 'codigo.regex' => 'El código no es válido. Revisa el código que te dio tu profesor.'];
    }
}
