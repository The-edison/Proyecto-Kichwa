<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreGrupoRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->rol_usuario === 'administrador';
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'nombre' => ['required', 'string', 'max:100', 'not_regex:/[<>\x00-\x1F]/u'],
            'codigo' => ['prohibited'],
            'admin_id' => ['prohibited'],
            'activo' => ['prohibited'],
        ];
    }

    public function messages(): array
    {
        return ['nombre.required' => 'Escribe el nombre del grupo.', 'nombre.max' => 'El nombre no debe superar los 100 caracteres.',
            'nombre.not_regex' => 'Usa un nombre sin etiquetas ni caracteres de control.', 'codigo.prohibited' => 'El código se genera automáticamente.'];
    }
}
