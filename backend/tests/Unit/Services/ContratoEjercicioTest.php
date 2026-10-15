<?php

namespace Tests\Unit\Services;

use App\Services\ContratoEjercicio;
use PHPUnit\Framework\TestCase;

class ContratoEjercicioTest extends TestCase
{
    public function test_accepts_canonically_equivalent_answers_with_case_and_spacing_differences(): void
    {
        $exercise = ['type' => 'completar', 'solution' => ['textos' => ['word' => ['Alli ñan']]]];

        $correct = ContratoEjercicio::grade($exercise, ['textos' => ['word' => "  ALLI  N\u{0303}AN  "]]);

        $this->assertTrue($correct);
    }

    public function test_accepts_decomposed_vowels_when_accents_are_ignored(): void
    {
        $exercise = ['type' => 'completar', 'solution' => ['textos' => ['word' => ['corazon']]], 'config' => ['ignore_accents' => true]];

        $correct = ContratoEjercicio::grade($exercise, ['textos' => ['word' => "CORAZO\u{0301}N"]]);

        $this->assertTrue($correct);
    }

    public function test_preserves_the_distinction_between_n_and_enye_when_accents_are_ignored(): void
    {
        $exercise = ['type' => 'completar', 'solution' => ['textos' => ['word' => ['ñan']]], 'config' => ['ignore_accents' => true]];

        $correct = ContratoEjercicio::grade($exercise, ['textos' => ['word' => 'nan']]);

        $this->assertFalse($correct);
    }

    public function test_rejects_missing_accents_when_accents_are_required(): void
    {
        $exercise = ['type' => 'completar', 'solution' => ['textos' => ['word' => ['corazón']]], 'config' => ['ignore_accents' => false]];

        $correct = ContratoEjercicio::grade($exercise, ['textos' => ['word' => 'corazon']]);

        $this->assertFalse($correct);
    }
}
