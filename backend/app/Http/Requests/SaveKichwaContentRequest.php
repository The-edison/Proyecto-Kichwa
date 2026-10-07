<?php

namespace App\Http\Requests;

use App\Models\Actividad;
use App\Services\KichwaResource;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class SaveKichwaContentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->rol_usuario === 'administrador';
    }

    public function rules(): array
    {
        $resource = $this->route('resource');
        $moduleIds = DB::table('modulos')->whereIn('id_nivel', DB::table('niveles')->whereIn('orden_nivel', [1, 2])->select('id_nivel'))->select('id_modulo');
        $unitParent = Rule::exists('unidades', 'id_unidad')->whereIn('id_modulo', $moduleIds);
        $rules = match ($resource) {
            'modules' => ['level_id' => ['required', 'integer', Rule::exists('niveles', 'id_nivel')->whereIn('orden_nivel', [1, 2])], 'title' => ['required', 'string', 'max:150'], 'description' => ['required', 'string', 'max:20000']],
            'units' => ['module_id' => ['required', 'integer', Rule::exists('modulos', 'id_modulo')->whereIn('id_nivel', DB::table('niveles')->whereIn('orden_nivel', [1, 2])->select('id_nivel'))], 'title' => ['required', 'string', 'max:180'], 'description' => ['required', 'string', 'max:20000']],
            'contents' => ['unit_id' => ['required', 'integer', $unitParent], 'kind' => ['required', Rule::in(['vocabulary', 'grammar', 'culture'])], 'title' => ['required', 'string', 'max:180'], 'body' => ['required', 'string', 'max:50000']],
            'exercises', 'questions' => [$resource === 'exercises' ? 'unit_id' : 'evaluation_id' => ['required', 'integer', $resource === 'exercises' ? $unitParent : 'exists:evaluaciones,id_evaluacion'],
                'type' => ['required', 'string'], 'prompt' => ['required', 'string', 'max:10000'], 'elements' => ['required', 'array'], 'zones' => ['present', 'array'], 'solution' => ['required', 'array'], 'resource' => ['nullable', 'string', 'max:500']],
            'evaluations' => ['unit_id' => ['nullable', 'integer', $unitParent], 'type' => ['required', Rule::in(['unidad', 'diagnostica'])], 'title' => ['required', 'string', 'max:180']],
            'diccionario' => ['kichwa' => ['required', 'string', 'max:200'], 'español' => ['required', 'string', 'max:250']],
            default => [],
        };
        if (isset(KichwaResource::FIELDS[$resource]['sort_order'])) {
            $rules['sort_order'] = ['sometimes', 'integer', 'min:1', 'max:2147483646'];
        }
        if ($resource === 'questions') {
            $rules['score'] = ['required', 'numeric', 'min:0.01', 'max:999999.99'];
        }
        if ($this->route('id')) {
            foreach ($rules as &$parts) {
                $parts = array_values(array_filter($parts, fn ($p) => $p !== 'required' && $p !== 'present'));
                array_unshift($parts, 'sometimes');
            }
        }

        if (in_array($resource, ['modules', 'units', 'contents'], true)) {
            $rules['published'] = ['sometimes', 'boolean'];
        }
        if ($resource === 'exercises') {
            $rules['topic_id'] = ['sometimes', 'nullable', 'integer', Rule::exists('temas', 'id_tema')->where('id_unidad', $this->input('unit_id') ?? Actividad::find($this->route('id'))?->id_unidad)];
        }
        if (! app()->environment('local', 'testing')) {
            foreach (['title', 'prompt', 'kichwa', 'español', 'body', 'description'] as $field) {
                if (isset($rules[$field])) {
                    $rules[$field][] = 'not_regex:/\[DEMO\]/i';
                }
            }
        }

        return $rules;
    }

    public function messages(): array
    {
        return ['not_regex' => 'Los datos [DEMO] sólo se permiten en local y testing.', 'exists' => 'El padre seleccionado no existe o no pertenece a la jerarquía permitida.',
            'required' => 'El campo :attribute es obligatorio.'];
    }
}
