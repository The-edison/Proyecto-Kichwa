<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Diccionario;
use App\Services\KichwaResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DiccionarioController extends Controller
{
    public function search(Request $request): JsonResponse
    {
        $data = $request->validate(['q' => ['nullable', 'string', 'max:100'], 'direccion' => ['required', 'in:kichwa-es,es-kichwa'], 'page' => ['sometimes', 'integer', 'min:1']]);
        $column = $data['direccion'] === 'kichwa-es' ? 'palabra_kichwa_diccionario' : 'palabra_espanol_diccionario';
        $query = Diccionario::query();
        $q = trim($data['q'] ?? '');
        if ($q !== '') {
            $literal = str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $q);
            $query->whereRaw("public.kichwa_normalizar($column) LIKE '%' || public.kichwa_normalizar(?) || '%'", [$literal])
                ->orderByRaw("CASE WHEN public.kichwa_normalizar($column) LIKE public.kichwa_normalizar(?) || '%' THEN 0 ELSE 1 END", [$literal]);
        }
        $page = $query->orderBy($column)->orderBy('id_diccionario')->paginate($q === '' ? 5 : 20);

        return response()->json($page->through(fn ($r) => KichwaResource::present('glossary', $r)));
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
        if (! in_array('kichwa', $headers, true) || ! in_array('spanish', $headers, true)) {
            fclose($handle);
            throw ValidationException::withMessages(['file' => 'El CSV debe incluir las columnas kichwa y spanish; synonyms y notes son opcionales.']);
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
            $spanish = trim($entry['spanish']);
            if ($kichwa === '' || $spanish === '' || mb_strlen($kichwa) > 200 || mb_strlen($spanish) > 250 || ! mb_check_encoding(implode('', $cells), 'UTF-8') || mb_strlen($entry['synonyms'] ?? '') > 2000 || mb_strlen($entry['notes'] ?? '') > 5000) {
                fclose($handle);
                throw ValidationException::withMessages(['file' => "La fila $line contiene campos vacíos, demasiado largos o texto que no es UTF-8."]);
            }
            $rows[] = ['palabra_kichwa_diccionario' => $kichwa, 'palabra_espanol_diccionario' => $spanish, 'sinonimos_diccionario' => $entry['synonyms'] ?? null, 'notas_diccionario' => $entry['notes'] ?? null];
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
