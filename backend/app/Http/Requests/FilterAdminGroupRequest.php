<?php

namespace App\Http\Requests;

use App\Models\Grupo;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class FilterAdminGroupRequest extends FormRequest
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
            'grupo_id' => ['sometimes', 'required', 'regex:/^(sin_grupo|[1-9][0-9]{0,17})$/'],
        ];
    }

    public function groupId(): int|string|null
    {
        $id = $this->validated('grupo_id');
        if ($id === null || $id === 'sin_grupo') {
            return $id;
        }

        return Grupo::where('admin_id', $this->user()->id_usuario)->findOrFail($id)->id;
    }
}
