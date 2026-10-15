<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class SaveTestimonialRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->rol_usuario === 'estudiante' && $this->user()?->estado_usuario === 'activo';
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'body' => ['required', 'string', 'min:20', 'max:500'],
            'language' => ['sometimes', 'in:es,qu'],
        ];
    }

    public function messages(): array
    {
        return [
            'body.required' => 'Escribe tu opinión antes de publicarla.',
            'body.string' => 'La opinión debe ser un texto.',
            'body.min' => 'La opinión debe tener al menos 20 caracteres.',
            'body.max' => 'La opinión no puede superar los 500 caracteres.',
            'language.in' => 'El idioma de la opinión no es válido.',
        ];
    }
}
