<?php

namespace Tests\Feature;

use App\Models\Modulo;
use App\Models\Nivel;
use App\Models\Unidad;
use App\Models\Usuario;
use Database\Seeders\UnidadDosGuiadaSeeder;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Tests\UsesPostgreSQL;

class StudentNavigationTest extends TestCase
{
    use UsesPostgreSQL;

    public function test_navigation_requires_an_authenticated_student(): void
    {
        $this->getJson('/api/learning-navigation')->assertUnauthorized();
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $this->getJson('/api/learning-navigation')->assertForbidden();
    }

    public function test_navigation_includes_ordered_published_hierarchy_without_pagination_or_private_data(): void
    {
        $this->seed(UnidadDosGuiadaSeeder::class);
        $level = Nivel::where('orden_nivel', 2)->firstOrFail();
        $module = Modulo::create(['id_nivel' => $level->id_nivel, 'nombre_modulo' => 'Conversaciones', 'descripcion_modulo' => 'Practicar.', 'orden_modulo' => 20, 'publicado' => true]);
        foreach (range(21, 1) as $order) {
            Unidad::create(['id_modulo' => $module->id_modulo, 'titulo_unidad' => 'Unidad '.$order, 'objetivo_unidad' => 'Practicar.', 'orden_unidad' => $order, 'publicado' => true, 'configuracion' => ['private' => 'secret']]);
        }
        Unidad::create(['id_modulo' => $module->id_modulo, 'titulo_unidad' => 'Oculta', 'objetivo_unidad' => 'Pendiente.', 'orden_unidad' => 22, 'publicado' => false]);
        $hiddenModule = Modulo::create(['id_nivel' => $level->id_nivel, 'nombre_modulo' => 'Oculto', 'descripcion_modulo' => 'Pendiente.', 'orden_modulo' => 21, 'publicado' => false]);
        Unidad::create(['id_modulo' => $hiddenModule->id_modulo, 'titulo_unidad' => 'Unidad de modulo oculto', 'objetivo_unidad' => 'Pendiente.', 'orden_unidad' => 1, 'publicado' => true]);
        Nivel::create(['nombre_nivel' => 'Oculto', 'descripcion_nivel' => 'Pendiente.', 'orden_nivel' => 99, 'publicado' => false]);
        Sanctum::actingAs(Usuario::factory()->create());
        $data = $this->getJson('/api/learning-navigation')->assertOk()->assertJsonCount(2)->assertJsonMissing(['name' => 'Oculto'])->assertJsonMissing(['title' => 'Oculta'])->assertJsonMissing(['title' => 'Unidad de modulo oculto'])->json();
        $intermediate = collect($data)->firstWhere('id', $level->id_nivel);
        $this->assertTrue($intermediate['available']);
        $units = collect($intermediate['modules'])->firstWhere('id', $module->id_modulo)['units'];
        $this->assertCount(21, $units);
        $this->assertSame(array_map(fn ($order) => 'Unidad '.$order, range(1, 21)), array_column($units, 'title'));
        $this->assertSame(['id', 'title'], array_keys($units[0]));
        foreach ($data as $item) {
            $this->getJson('/api/levels/'.$item['id'].'/modules')->assertOk();
            foreach ($item['modules'] as $entry) {
                $this->getJson('/api/modules/'.$entry['id'])->assertOk();
            }
        }
    }

    public function test_admin_publication_changes_refresh_the_navigation_cache(): void
    {
        $this->seed(UnidadDosGuiadaSeeder::class);
        $student = Usuario::factory()->create();
        Sanctum::actingAs($student);
        $this->getJson('/api/learning-navigation')->assertOk();
        $unit = Unidad::where('publicado', true)->firstOrFail();
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $this->patchJson('/api/admin/units/'.$unit->id_unidad, ['module_id' => $unit->id_modulo, 'title' => $unit->titulo_unidad, 'description' => $unit->objetivo_unidad, 'config' => $unit->configuracion, 'published' => false])->assertOk();
        Sanctum::actingAs($student);
        $data = $this->getJson('/api/learning-navigation')->assertOk()->json();
        $ids = collect($data)->flatMap(fn ($level) => $level['modules'])->flatMap(fn ($module) => $module['units'])->pluck('id')->all();
        $this->assertNotContains($unit->id_unidad, $ids);
        $this->getJson('/api/units/'.$unit->id_unidad)->assertNotFound();
    }
}
