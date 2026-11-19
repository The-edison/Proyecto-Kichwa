<?php

namespace Tests\Feature;

use App\Models\Testimonial;
use App\Models\Usuario;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;
use Tests\UsesPostgreSQL;

class ComentariosDestacadosTest extends TestCase
{
    use UsesPostgreSQL;

    #[DataProvider('browserOrigins')]
    public function test_browser_guests_can_read_featured_opinions_but_cannot_publish_or_access_private_routes(string $host, string $origin): void
    {
        $opinion = $this->opinion('Excelente plataforma para aprender Kichwa con mi familia.');
        config()->set('sanctum.stateful', [$host]);
        $this->withHeader('Origin', $origin);

        $this->getJson('/api/comentarios/destacados')->assertOk()
            ->assertJsonCount(1)->assertJsonPath('0.id', $opinion->id)->assertJsonPath('0.name', 'Ana P.');
        $this->assertGuest('web');
        $this->getJson('/api/auth/me')->assertUnauthorized();
        $this->getJson('/api/testimonials/eligibility')->assertUnauthorized();
        $this->postJson('/api/testimonials', ['body' => 'Excelente plataforma para aprender Kichwa.'])->assertUnauthorized();
    }

    public static function browserOrigins(): array
    {
        return [
            'local' => ['127.0.0.1:5173', 'http://127.0.0.1:5173'],
            'production' => ['yachay-kichwa.devs-ueb.tech', 'https://yachay-kichwa.devs-ueb.tech'],
        ];
    }

    public function test_publishing_refreshes_an_empty_featured_cache_without_waiting_for_the_weekly_job(): void
    {
        $this->getJson('/api/comentarios/destacados')->assertOk()->assertExactJson([]);
        Sanctum::actingAs(Usuario::factory()->create());

        $response = $this->postJson('/api/testimonials', ['body' => 'Excelente plataforma para aprender Kichwa con mi familia.'])->assertCreated();

        $this->getJson('/api/comentarios/destacados')->assertOk()->assertJsonCount(1)
            ->assertJsonPath('0.id', $response->json('id'))->assertJsonPath('0.body', $response->json('body'));
    }

    public function test_publishing_and_editing_recalculate_a_previously_cached_selection(): void
    {
        $this->freezeTime();
        $first = $this->opinion('Excelente plataforma para aprender Kichwa con mi familia.');
        $this->getJson('/api/comentarios/destacados')->assertJsonCount(1)->assertJsonPath('0.id', $first->id);
        Sanctum::actingAs(Usuario::factory()->create());
        $published = $this->postJson('/api/testimonials', ['body' => 'Excelente y genial plataforma, la recomiendo a mi familia.'])->assertCreated();

        $this->getJson('/api/comentarios/destacados')->assertJsonCount(2)->assertJsonPath('0.id', $published->json('id'));
        $this->postJson('/api/testimonials', ['body' => 'Una experiencia de aprendizaje con toda mi familia.'])->assertOk();
        $this->getJson('/api/comentarios/destacados')->assertJsonCount(1)->assertJsonPath('0.id', $first->id);
    }

    #[DataProvider('scores')]
    public function test_saving_an_opinion_calculates_its_score_and_exclusion(string $body, int $score, bool $excluded): void
    {
        Sanctum::actingAs(Usuario::factory()->create());

        $response = $this->postJson('/api/testimonials', ['body' => $body, 'puntaje' => 999, 'excluido' => false])->assertCreated();

        $this->assertDatabaseHas('testimonials', ['id' => $response->json('id'), 'puntaje' => $score, 'excluido' => $excluded]);
    }

    public static function scores(): array
    {
        return [
            'case accents and phrases' => ['EXCELENTE: me GUSTÓ aprender; es ÚTIL, FÁCIL e increíble.', 5, false],
            'immediate negations' => ['No excelente, nada perfecto, poco genial para aprender.', 0, false],
            'simple connecting words' => ['No es muy útil y no me gustó esta plataforma de aprendizaje.', 0, false],
            'negative phrases and words' => ['Excelente, excelente, pero no funciona, tiene un error y es lento.', -4, false],
            'negative accents' => ['PÉSIMO, horrible, malo, difícil y basura para aprender.', -10, false],
            'complete words only' => ['Excelentemente describe una facilidad que no está en las listas.', 0, false],
            'profanity despite positive score' => ['Excelente, genial y perfecto, pero esta mierda no ayuda.', 3, true],
            'spam phrase' => ['Excelente plataforma: compra ahora y gana dinero fácilmente.', 1, true],
            'spam URL' => ['Excelente plataforma, visita https://spam.example para aprender.', 1, true],
            'test comment' => ['PRUEBA DE COMENTARIO: ME GUSTO EL SISTEMA', 1, true],
        ];
    }

    public function test_the_public_endpoint_returns_at_most_six_by_score_then_creation_date_without_sensitive_data(): void
    {
        $this->freezeTime();
        $expected = [];
        foreach (range(1, 8) as $number) {
            $this->travel(1)->minutes();
            $opinion = $this->opinion('Excelente plataforma para aprender Kichwa con mi familia.');
            $expected[] = $opinion->id;
        }
        $best = $this->opinion('Excelente y genial, una plataforma que recomiendo para aprender.');
        $expected = [$best->id, ...array_slice(array_reverse($expected), 0, 5)];

        $response = $this->getJson('/api/comentarios/destacados')->assertOk()->assertJsonCount(6);

        $this->assertSame($expected, array_column($response->json(), 'id'));
        foreach ($response->json() as $item) {
            $this->assertSame(['id', 'name', 'body', 'language', 'created_at'], array_keys($item));
            $this->assertSame('Ana P.', $item['name']);
        }
    }

    public function test_quality_filters_exclude_short_old_future_neutral_negative_prohibited_and_inactive_opinions(): void
    {
        $this->freezeTime();
        $valid = $this->opinion('Excelente plataforma para aprender Kichwa con mi familia.');
        $this->opinion('Excelente pero corto.');
        $this->opinion('Una plataforma que uso para aprender con mi familia.');
        $this->opinion('No funciona y es difícil aprender con esta plataforma.');
        $this->opinion('Excelente pero con spam: gana dinero con esta plataforma.');
        $this->opinion('PRUEBA DE COMENTARIO: ME GUSTO EL SISTEMA');
        $old = $this->opinion('Excelente plataforma para aprender Kichwa con mi familia.');
        $old->forceFill(['created_at' => now()->subDays(30)->subSecond()])->save();
        $future = $this->opinion('Excelente plataforma para aprender Kichwa con mi familia.');
        $future->forceFill(['created_at' => now()->addSecond()])->save();
        $blocked = $this->opinion('Excelente plataforma para aprender Kichwa con mi familia.');
        DB::table('usuarios')->where('id_usuario', $blocked->usuario_id)->update(['estado_usuario' => 'bloqueado']);

        $response = $this->getJson('/api/comentarios/destacados')->assertOk()->assertJsonCount(1);

        $response->assertJsonPath('0.id', $valid->id);
    }

    public function test_quality_boundaries_include_thirty_characters_and_exactly_thirty_days(): void
    {
        $this->freezeTime();
        $opinion = $this->opinion('Excelente '.str_repeat('a', 20));
        $opinion->forceFill(['created_at' => now()->subDays(30)])->save();
        $this->opinion('Excelente '.str_repeat('a', 19));

        $this->getJson('/api/comentarios/destacados')->assertOk()->assertJsonCount(1)->assertJsonPath('0.id', $opinion->id);

        $this->travel(1)->seconds();
        $this->getJson('/api/comentarios/destacados')->assertJsonCount(2)->assertJsonPath('1.id', $opinion->id);
    }

    public function test_selection_is_cached_for_one_week_then_new_candidates_are_included(): void
    {
        $this->freezeTime();
        $first = $this->opinion('Excelente plataforma para aprender Kichwa con mi familia.');
        $this->getJson('/api/comentarios/destacados')->assertJsonCount(1)->assertJsonPath('0.id', $first->id);
        $best = $this->opinion('Excelente y genial plataforma, la recomiendo a mi familia.');

        $this->travel(6)->days();
        $this->getJson('/api/comentarios/destacados')->assertJsonCount(1)->assertJsonPath('0.id', $first->id);
        $this->travel(1)->days();

        $this->getJson('/api/comentarios/destacados')->assertJsonCount(2)->assertJsonPath('0.id', $best->id);
    }

    public function test_edits_deletions_and_blocked_authors_are_not_served_from_the_weekly_selection(): void
    {
        $this->freezeTime();
        $edited = $this->opinion('Excelente plataforma para aprender Kichwa con mi familia.');
        $blocked = $this->opinion('Excelente plataforma para aprender Kichwa con mi familia.');
        $deleted = $this->opinion('Excelente plataforma para aprender Kichwa con mi familia.');
        $this->getJson('/api/comentarios/destacados')->assertJsonCount(3);
        Sanctum::actingAs($edited->usuario);

        $this->postJson('/api/testimonials', ['body' => 'Excelente plataforma: compra ahora y gana dinero con nosotros.'])->assertOk();
        DB::table('usuarios')->where('id_usuario', $blocked->usuario_id)->update(['estado_usuario' => 'bloqueado']);
        $deleted->delete();

        $this->getJson('/api/comentarios/destacados')->assertExactJson([]);
    }

    public function test_html_is_sanitized_before_validation_and_scoring(): void
    {
        Sanctum::actingAs(Usuario::factory()->create());

        $response = $this->postJson('/api/testimonials', ['body' => ' <script>casino</script><b>Excelente</b> &amp; útil plataforma para aprender Kichwa. '])->assertCreated();

        $response->assertJsonPath('body', 'Excelente & útil plataforma para aprender Kichwa.');
        $this->assertDatabaseHas('testimonials', ['id' => $response->json('id'), 'puntaje' => 2, 'excluido' => false]);
        $this->postJson('/api/testimonials', ['body' => '<script>'.str_repeat('a', 40).'</script>'])->assertUnprocessable()->assertJsonValidationErrors('body');
    }

    public function test_backfill_preserves_dates_sanitizes_existing_comments_and_refreshes_the_cache_idempotently(): void
    {
        $this->freezeTime();
        $this->getJson('/api/comentarios/destacados')->assertExactJson([]);
        $student = Usuario::factory()->create();
        $created = now()->subDays(5)->toDateTimeString();
        $id = DB::table('testimonials')->insertGetId(['usuario_id' => $student->id_usuario, 'body' => '<b>Excelente</b> plataforma para aprender Kichwa en familia.', 'created_at' => $created, 'updated_at' => $created]);
        $testStudent = Usuario::factory()->create();
        $testId = DB::table('testimonials')->insertGetId(['usuario_id' => $testStudent->id_usuario, 'body' => 'PRUEBA DE COMENTARIO: ME GUSTO EL SISTEMA', 'created_at' => $created, 'updated_at' => $created]);
        $this->getJson('/api/comentarios/destacados')->assertExactJson([]);

        $this->artisan('comentarios:actualizar-destacados')->assertSuccessful();
        $this->artisan('comentarios:actualizar-destacados')->assertSuccessful();

        $this->assertDatabaseHas('testimonials', ['id' => $id, 'body' => 'Excelente plataforma para aprender Kichwa en familia.', 'puntaje' => 1, 'created_at' => $created, 'updated_at' => $created]);
        $this->assertDatabaseHas('testimonials', ['id' => $testId, 'excluido' => true]);
        $this->assertDatabaseCount('testimonials', 2);
        $this->getJson('/api/comentarios/destacados')->assertJsonCount(1)->assertJsonPath('0.id', $id);
    }

    public function test_configurable_lists_apply_without_changing_the_scoring_logic(): void
    {
        config(['comentarios.positivas' => ['maravillosa'], 'comentarios.prohibidas' => ['anuncio comercial']]);
        $good = $this->opinion('Maravillosa plataforma para aprender Kichwa con mi familia.');
        $bad = $this->opinion('Maravillosa plataforma para ver este anuncio comercial.');

        $this->assertSame(1, $good->puntaje);
        $this->assertTrue($bad->excluido);
        $this->getJson('/api/comentarios/destacados')->assertJsonCount(1)->assertJsonPath('0.id', $good->id);
    }

    public function test_without_featured_opinions_existing_comments_are_used_even_if_short_old_neutral_or_negative(): void
    {
        $this->freezeTime();
        $old = $this->opinion('Excelente plataforma para aprender Kichwa con mi familia.');
        $old->forceFill(['created_at' => now()->subDays(60)])->save();
        $neutral = $this->opinion('Aprendo Kichwa con mi familia usando la plataforma.');
        $this->travel(1)->minutes();
        $short = $this->opinion('Me gusta esta plataforma.');
        $this->travel(1)->minutes();
        $negative = $this->opinion('Es lento aprender con esta plataforma y los ejercicios.');
        $this->opinion('Excelente pero con spam: gana dinero con esta plataforma.');
        $this->opinion('Excelente plataforma pero con esta mierda no aprendo.');
        $this->opinion('PRUEBA DE COMENTARIO: ME GUSTO EL SISTEMA');
        $blocked = $this->opinion('Aprendo Kichwa con mi familia usando la plataforma.');
        DB::table('usuarios')->where('id_usuario', $blocked->usuario_id)->update(['estado_usuario' => 'bloqueado']);

        $response = $this->getJson('/api/comentarios/destacados')->assertOk()->assertJsonCount(4);

        $this->assertSame([$negative->id, $short->id, $neutral->id, $old->id], array_column($response->json(), 'id'));
    }

    public function test_fallback_keeps_the_six_most_recent_comments_and_rechecks_exclusions_in_cache(): void
    {
        $this->freezeTime();
        $opinions = [];
        foreach (range(1, 8) as $number) {
            $this->travel(1)->minutes();
            $opinions[] = $this->opinion('Mi experiencia aprendiendo Kichwa número '.$number.'.');
        }
        $response = $this->getJson('/api/comentarios/destacados')->assertJsonCount(6);
        $this->assertSame(array_map(fn (Testimonial $opinion): int => $opinion->id, array_reverse(array_slice($opinions, 2))), array_column($response->json(), 'id'));

        $opinions[7]->update(['body' => 'Excelente plataforma: compra ahora para ganar dinero.']);

        $this->getJson('/api/comentarios/destacados')->assertJsonCount(5)->assertJsonMissing(['id' => $opinions[7]->id]);
    }

    private function opinion(string $body): Testimonial
    {
        return Testimonial::create(['usuario_id' => Usuario::factory()->create(['nombre_usuario' => 'Ana Pérez López'])->id_usuario, 'body' => $body]);
    }
}
