<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Diccionario;
use App\Services\KichwaResource;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DiccionarioController extends Controller
{
    public function search(Request $request): JsonResponse
    {
        $data = $request->validate(['q' => ['nullable', 'string', 'max:100'], 'direccion' => ['required', 'in:kichwa-es,es-kichwa'], 'page' => ['sometimes', 'integer', 'min:1']]);
        $column = $data['direccion'] === 'kichwa-es' ? 'kichwa' : 'español';
        $query = Diccionario::query();
        $q = trim($data['q'] ?? '');
        if ($q !== '') {
            $literal = str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $q);
            $query->whereRaw("public.kichwa_normalizar($column) LIKE '%' || public.kichwa_normalizar(?) || '%'", [$literal])
                ->orderByRaw("CASE WHEN public.kichwa_normalizar(btrim($column)) = public.kichwa_normalizar(?) THEN 0 ELSE 1 END", [$q]);
            if ($data['direccion'] === 'es-kichwa') {
                $this->orderSpanishMeanings($query, $q);
            }
            $query->orderByRaw("public.similarity(public.kichwa_normalizar(btrim($column)), public.kichwa_normalizar(?)) DESC", [$q])
                ->orderByRaw("CASE WHEN public.kichwa_normalizar(btrim($column)) LIKE public.kichwa_normalizar(?) || '%' THEN 0 ELSE 1 END", [$literal])
                ->orderByRaw("char_length(btrim($column)) ASC");
        }
        $page = $query->orderBy($column)->orderBy('id')->paginate($q === '' ? 5 : 20);

        return response()->json($page->through(fn ($r) => KichwaResource::present('diccionario', $r)));
    }

    private function orderSpanishMeanings(Builder $query, string $word): void
    {
        // Definitions contain grammatical labels and several meanings, e.g. "s. agua, líquido; s. octubre."
        $definition = "regexp_replace(public.kichwa_normalizar(español), '^[[:space:]]*[(][^)]*[)][[:space:],]*', '')";
        $meanings = "regexp_split_to_table($definition, '[,;]') WITH ORDINALITY AS definition(term, position)";
        $withoutAnnotation = "regexp_replace(btrim(definition.term), '^[(][^)]*[)][[:space:]]*', '')";
        $withoutLabels = "regexp_replace($withoutAnnotation, '^((s|adj|v|adv|exp|expr|pron|interj|prep|conj|num|art|loc)[.][[:space:]]*)+', '')";
        $meaning = "btrim(regexp_replace($withoutLabels, '[[:space:].]+$', ''))";
        $words = "regexp_replace($meaning, '[^[:alnum:]_]+', ' ', 'g')";
        $searchWords = "regexp_replace(public.kichwa_normalizar(?), '[^[:alnum:]_]+', ' ', 'g')";

        $query->orderByRaw("(SELECT min(CASE
            WHEN $meaning = public.kichwa_normalizar(?) THEN CASE WHEN definition.position = 1 THEN 0 ELSE 1 END
            WHEN strpos(' ' || $words || ' ', ' ' || $searchWords || ' ') > 0 THEN 2
            ELSE 3 END) FROM $meanings)", [$word, $word])
            ->orderByRaw("(SELECT max(CASE WHEN strpos($meaning, public.kichwa_normalizar(?)) > 0
                THEN public.similarity($meaning, public.kichwa_normalizar(?)) ELSE 0 END) FROM $meanings) DESC", [$word, $word]);
    }

    public function import(Request $request): JsonResponse
    {
        $request->validate(['file' => ['required', 'file', 'mimes:csv,txt', 'extensions:csv', 'max:2048']]);
        $handle = fopen($request->file('file')->getPathname(), 'r');
        $first = fgets($handle);
        $separator = substr_count($first ?? '', ';') > substr_count($first ?? '', ',') ? ';' : ',';
        rewind($handle);
        $headers = fgetcsv($handle, 0, $separator, '"', '');
        if (! $headers) {
            fclose($handle);
            throw ValidationException::withMessages(['file' => 'El CSV está vacío.']);
        }
        $headers = array_map(fn ($v) => trim(ltrim($v, "\xEF\xBB\xBF")), $headers);
        if (count($headers) !== 2 || ! in_array('kichwa', $headers, true) || ! in_array('español', $headers, true)) {
            fclose($handle);
            throw ValidationException::withMessages(['file' => 'El CSV debe incluir únicamente las columnas kichwa y español. El id se genera automáticamente.']);
        }
        $rows = [];
        $line = 1;
        while (($cells = fgetcsv($handle, 0, $separator, '"', '')) !== false) {
            $line++;
            if ($cells === [null]) {
                continue;
            }
            if (count($rows) >= 10000 || count($cells) !== count($headers)) {
                fclose($handle);
                throw ValidationException::withMessages(['file' => "Revisa la fila $line; máximo 10.000 entradas por archivo."]);
            }
            $entry = array_combine($headers, $cells);
            if (! app()->environment('local', 'testing') && preg_match('/\[DEMO\]/i', implode('', $cells))) {
                fclose($handle);
                throw ValidationException::withMessages(['file' => "La fila $line contiene datos [DEMO], permitidos sólo en local y testing."]);
            }
            $kichwa = trim($entry['kichwa']);
            $espanol = trim($entry['español']);
            if ($kichwa === '' || $espanol === '' || mb_strlen($kichwa) > 200 || mb_strlen($espanol) > 250 || ! mb_check_encoding(implode('', $cells), 'UTF-8')) {
                fclose($handle);
                throw ValidationException::withMessages(['file' => "La fila $line contiene campos vacíos, demasiado largos o texto que no es UTF-8."]);
            }
            $rows[] = ['kichwa' => $kichwa, 'español' => $espanol];
        }
        fclose($handle);
        $inserted = DB::transaction(function () use ($rows): int {
            $total = 0;
            foreach (array_chunk($rows, 500) as $chunk) {
                $total += DB::table('diccionario')->insertOrIgnore($chunk);
            }

            return $total;
        });

        return response()->json(['inserted' => $inserted, 'skipped' => count($rows) - $inserted, 'message' => "$inserted entradas importadas; los duplicados se conservaron."], 201);
    }
}
