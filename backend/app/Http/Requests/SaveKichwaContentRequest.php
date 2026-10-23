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
        $moduleIds = DB::table('modulos')->whereIn('id_nivel', DB::table('niveles')->select('id_nivel'))->select('id_modulo');
        $unitParent = Rule::exists('unidades', 'id_unidad')->whereIn('id_modulo', $moduleIds);
        $rules = match ($resource) {
            'levels' => ['name' => ['required', 'string', 'max:80'], 'description' => ['required', 'string', 'max:20000']],
            'modules' => ['level_id' => ['required', 'integer', Rule::exists('niveles', 'id_nivel')], 'title' => ['required', 'string', 'max:150'], 'description' => ['required', 'string', 'max:20000']],
            'units' => ['module_id' => ['required', 'integer', Rule::exists('modulos', 'id_modulo')->whereIn('id_nivel', DB::table('niveles')->select('id_nivel'))], 'title' => ['required', 'string', 'max:180'], 'description' => ['required', 'string', 'max:20000']],
            'contents' => ['unit_id' => ['required', 'integer', $unitParent], 'kind' => ['required', Rule::in(['vocabulary', 'grammar', 'culture'])], 'title' => ['required', 'string', 'max:180'], 'body' => ['required', 'string', 'max:50000']],
            'exercises', 'questions' => [$resource === 'exercises' ? 'unit_id' : 'evaluation_id' => ['required', 'integer', $resource === 'exercises' ? $unitParent : 'exists:evaluaciones,id_evaluacion'],
                'type' => ['required', Rule::in(['seleccion_multiple', 'completar', 'relacionar', 'arrastrar', 'ordenar'])], 'prompt' => ['required', 'string', 'max:10000'], 'elements' => ['required', 'array', 'max:50'], 'zones' => ['present', 'array', 'max:50'], 'solution' => ['required', 'array'], 'resource' => ['nullable', 'string', 'max:500']],
            'evaluations' => ['unit_id' => ['nullable', 'integer', $unitParent], 'module_id' => ['nullable', 'integer', 'exists:modulos,id_modulo'], 'type' => ['required', Rule::in(['unidad', 'diagnostica', 'modulo'])], 'title' => ['required', 'string', 'max:180']],
            'diccionario' => ['kichwa' => ['required', 'string', 'max:200'], 'español' => ['required', 'string', 'max:250']],
            default => [],
        };
        if (isset(KichwaResource::FIELDS[$resource]['sort_order'])) {
            $rules['sort_order'] = ['sometimes', 'integer', 'min:1', 'max:2147483646'];
        }
        if ($resource === 'units') {
            $rules['config'] = ['sometimes', 'array:learning_mode,guided_lesson'];
            $rules['config.learning_mode'] = ['sometimes', 'in:classic,sequence,guided'];
            $rules['config.guided_lesson'] = ['sometimes', 'in:writing,greetings,pronouns,numbers,calendar,animals-colors,body,nature,verbs,advanced-morphemes,time-morphemes,verbal-analysis,short-dialogues'];
        }
        if (in_array($resource, ['exercises', 'questions', 'evaluations'], true)) {
            $rules['config'] = ['sometimes', 'array:body_activity,body_panel,color_activity,color_panel,animal_group,animal_activity,pronouns_activity,sentence_order,scene_choice,conversation_group,conversation_pairs,listening_greetings,listening_questions,managed,reviewed,requires_audio,requires_images,max_selections,exact_selections,ignore_accents,explanation,correct_feedback,incorrect_feedback,title,difficulty,question_count,pass_percentage,final,presentation,word_target,missing_index,context_text,context_meaning,prompt_image,prompt_image_alt,reveal_highlight,sequence_mode,fixed_order,required_correct,prerequisite_activities'];
            foreach (['sentence_order', 'scene_choice', 'conversation_pairs', 'listening_greetings', 'listening_questions', 'managed', 'reviewed', 'requires_audio', 'requires_images', 'exact_selections', 'ignore_accents', 'final', 'sequence_mode', 'fixed_order'] as $flag) {
                $rules['config.'.$flag] = ['sometimes', 'boolean'];
            }
            foreach (['title', 'explanation', 'correct_feedback', 'incorrect_feedback', 'word_target', 'context_text', 'context_meaning', 'prompt_image', 'prompt_image_alt', 'reveal_highlight'] as $text) {
                $rules['config.'.$text] = ['nullable', 'string', 'max:2000'];
            }
            $rules['config.max_selections'] = ['sometimes', 'integer', 'between:1,50'];
            $rules['config.question_count'] = ['sometimes', 'integer', 'between:1,100'];
            $rules['config.pass_percentage'] = ['sometimes', 'integer', 'between:1,100'];
            $rules['config.conversation_group'] = ['sometimes', 'in:q,a,d,c'];
            $rules['config.pronouns_activity'] = ['sometimes', 'in:persons,groups,listening,complete,order,listening-pronouns'];
            $rules['config.body_activity'] = ['sometimes', 'in:locate,details,recognize,listen,understand,order'];
            $rules['config.body_panel'] = ['sometimes', 'integer', 'between:1,4'];
            $rules['config.color_activity'] = ['sometimes', 'in:apply,listen,understand,interpret,meaning,complete,order'];
            $rules['config.color_panel'] = ['sometimes', 'integer', 'between:1,5'];
            $rules['config.animal_group'] = ['sometimes', 'in:domestic,wild'];
            $rules['config.animal_activity'] = ['sometimes', 'in:identify,listen,understand,complete,understand-complete,order,labels,write'];
            if ($resource === 'evaluations') {
                $rules['config'][1] .= ',prerequisite_units,bank_key';
                $rules['config.prerequisite_units'] = ['sometimes', 'array', 'min:1', 'max:100'];
                $rules['config.prerequisite_units.*'] = ['integer', 'distinct', 'exists:unidades,id_unidad'];
                $rules['config.bank_key'] = ['sometimes', 'string', 'max:100'];
            }
            $rules['config.presentation'] = ['sometimes', 'in:buttons,visual,letter,tiles,writing'];
            $rules['config.missing_index'] = ['sometimes', 'integer', 'between:0,49'];
            $rules['config.required_correct'] = ['sometimes', 'integer', 'between:1,100'];
            $rules['config.prerequisite_activities'] = ['sometimes', 'array', 'size:7'];
            $rules['config.prerequisite_activities.*'] = ['integer', 'distinct', 'exists:actividades,id_actividad'];
            $rules['config.difficulty'] = ['sometimes', 'in:inicial,medio,avanzado'];
            if ($this->boolean('config.managed') && ! $this->boolean('published')) {
                if (isset($rules['prompt'])) {
                    $rules['prompt'] = ['present', 'nullable', 'string', 'max:10000'];
                    $rules['elements'] = ['present', 'array', 'max:50'];
                    $rules['solution'] = ['present', 'array'];
                    $rules['elements.*'] = ['array:id,texto,grupo,imagen,opciones'];
                    $rules['elements.*.id'] = ['sometimes', 'string', 'max:40', 'regex:/^[a-zA-Z0-9_-]+$/', 'distinct:strict'];
                    $rules['elements.*.texto'] = ['nullable', 'string', 'max:500'];
                    $rules['elements.*.imagen'] = ['nullable', 'string', 'max:500'];
                    $rules['elements.*.grupo'] = ['sometimes', Rule::in(['origen', 'destino'])];
                    $rules['elements.*.opciones'] = ['sometimes', 'array', 'max:50'];
                    $rules['elements.*.opciones.*'] = ['string', 'max:500'];
                    $rules['zones.*'] = ['array:id,texto,x,y,imagen'];
                    $rules['zones.*.id'] = ['sometimes', 'string', 'max:40', 'regex:/^[a-zA-Z0-9_-]+$/', 'distinct:strict'];
                    $rules['zones.*.texto'] = ['nullable', 'string', 'max:500'];
                    $rules['zones.*.imagen'] = ['nullable', 'string', 'max:500'];
                    foreach (['x', 'y'] as $axis) {
                        $rules['zones.*.'.$axis] = ['sometimes', 'numeric', 'between:0,1'];
                    }
                }
            }
        }
        if ($resource === 'evaluations') {
            $rules['topic_id'] = ['sometimes', 'nullable', 'integer', Rule::exists('temas', 'id_tema')->where('id_unidad', $this->input('unit_id'))];
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

        if (in_array($resource, ['levels', 'modules', 'units', 'contents', 'exercises', 'questions', 'evaluations'], true)) {
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
