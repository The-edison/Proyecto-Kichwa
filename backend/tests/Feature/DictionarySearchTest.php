<?php

namespace Tests\Feature;

use App\Models\Diccionario;
use App\Models\Usuario;
use Illuminate\Http\UploadedFile;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Tests\UsesPostgreSQL;

class DictionarySearchTest extends TestCase
{
    use UsesPostgreSQL;

    public function test_demo_csv_is_rejected_outside_local_and_testing(): void
    {
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $original = app()->environment();
        app()->detectEnvironment(fn () => 'production');
        try {
            $this->postJson('/api/admin/glossary/import', ['file' => UploadedFile::fake()->createWithContent('entrada.csv', "kichwa,spanish\n[DEMO] prueba,entrada\n")])->assertUnprocessable()->assertJsonValidationErrors('file');
            $this->assertDatabaseCount('diccionario', 0);
        } finally {
            app()->detectEnvironment(fn () => $original);
        }
    }

    public function test_direction_accents_prefix_priority_and_metadata_are_returned(): void
    {
        Diccionario::create(['palabra_kichwa_diccionario' => 'xábc', 'palabra_espanol_diccionario' => 'Otra entrada técnica']);
        $first = Diccionario::create(['palabra_kichwa_diccionario' => 'Ábc inicial', 'palabra_espanol_diccionario' => 'Éxito técnico', 'sinonimos_diccionario' => '[DEMO] Alternativa', 'notas_diccionario' => '[DEMO] Verificación']);
        $this->getJson('/api/diccionario/buscar?q=ABC&direccion=kichwa-es')->assertOk()->assertJsonPath('total', 2)->assertJsonPath('data.0.id', $first->id_diccionario)->assertJsonPath('data.0.notes', '[DEMO] Verificación');
        $this->getJson('/api/diccionario/buscar?q=exito&direccion=es-kichwa')->assertOk()->assertJsonPath('total', 1)->assertJsonPath('data.0.kichwa', 'Ábc inicial');
        $this->getJson('/api/diccionario/buscar?q=%25&direccion=es-kichwa')->assertOk()->assertJsonPath('total', 0);
        $this->getJson('/api/diccionario/buscar?q=x&direccion=invalid')->assertUnprocessable()->assertJsonValidationErrors('direccion');
    }

    public function test_search_is_paginated_at_twenty_and_blank_query_only_suggests_five(): void
    {
        foreach (range(1, 25) as $i) {
            Diccionario::create(['palabra_kichwa_diccionario' => '[DEMO] código '.$i, 'palabra_espanol_diccionario' => '[DEMO] entrada '.$i]);
        }
        $this->getJson('/api/diccionario/buscar?q=codigo&direccion=kichwa-es')->assertOk()->assertJsonCount(20, 'data')->assertJsonPath('total', 25)->assertJsonPath('last_page', 2);
        $this->getJson('/api/diccionario/buscar?q=codigo&direccion=kichwa-es&page=2')->assertOk()->assertJsonCount(5, 'data');
        $this->getJson('/api/diccionario/buscar?q=&direccion=kichwa-es')->assertOk()->assertJsonCount(5, 'data');
    }

    public function test_csv_import_is_admin_only_atomic_and_preserves_existing_duplicates(): void
    {
        $csv = "kichwa,spanish,synonyms,notes\n[DEMO] código,[DEMO] entrada,alternativa,nota\n";
        Sanctum::actingAs(Usuario::factory()->create());
        $this->postJson('/api/admin/glossary/import', ['file' => UploadedFile::fake()->createWithContent('entrada.csv', $csv)])->assertForbidden();
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $this->postJson('/api/admin/glossary/import', ['file' => UploadedFile::fake()->createWithContent('entrada.csv', $csv)])->assertCreated()->assertJsonPath('inserted', 1);
        $this->postJson('/api/admin/glossary/import', ['file' => UploadedFile::fake()->createWithContent('entrada.csv', $csv)])->assertCreated()->assertJsonPath('skipped', 1);
        $this->postJson('/api/admin/glossary/import', ['file' => UploadedFile::fake()->createWithContent('entrada.csv', "kichwa,spanish\n[DEMO] otro,entrada\n,inválida\n")])->assertUnprocessable()->assertJsonValidationErrors('file');
        $this->assertDatabaseCount('diccionario', 1);
        $this->assertDatabaseHas('diccionario', ['notas_diccionario' => 'nota']);
    }
}
