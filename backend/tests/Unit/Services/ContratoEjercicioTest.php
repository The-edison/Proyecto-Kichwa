<?php

namespace Tests\Unit\Services;

use App\Services\ContratoEjercicio;
use PHPUnit\Framework\TestCase;

class ContratoEjercicioTest extends TestCase
{
    public function test_completion_feedback_identifies_each_answer_using_the_same_normalization_as_grading(): void
    {
        $exercise = ['type' => 'completar', 'solution' => ['textos' => ['first' => ['ñan'], 'second' => ['corazón'], 'third' => ['kan']]], 'config' => ['ignore_accents' => true]];
        $answer = ['textos' => ['first' => "  N\u{0303}AN  ", 'second' => 'CORAZON', 'third' => 'pay']];

        $this->assertSame(['item_results' => ['first' => true, 'second' => true, 'third' => false]], ContratoEjercicio::itemResults($exercise, $answer));
    }

    public function test_selection_feedback_marks_only_submitted_choices_without_revealing_unselected_answers(): void
    {
        $exercise = ['type' => 'seleccion_multiple', 'solution' => ['seleccion' => ['a', 'u']]];

        $this->assertSame(['item_results' => ['a' => true, 'b' => false]], ContratoEjercicio::itemResults($exercise, ['seleccion' => ['a', 'b']]));
    }

    public function test_order_feedback_accepts_interchangeable_repeated_letters_and_marks_wrong_positions(): void
    {
        $exercise = ['type' => 'ordenar', 'elements' => [['id' => 's1', 'texto' => 's'], ['id' => 'i', 'texto' => 'i'], ['id' => 's2', 'texto' => 's'], ['id' => 'a', 'texto' => 'a']], 'solution' => ['orden' => ['s1', 'i', 's2', 'a']]];
        $answer = ['orden' => ['s2', 'i', 's1', 'a']];

        $this->assertTrue(ContratoEjercicio::grade($exercise, $answer));
        $this->assertSame(['item_results' => ['s2' => true, 'i' => true, 's1' => true, 'a' => true]], ContratoEjercicio::itemResults($exercise, $answer));
        $this->assertSame(['item_results' => ['s1' => true, 'a' => false, 's2' => true, 'i' => false]], ContratoEjercicio::itemResults($exercise, ['orden' => ['s1', 'a', 's2', 'i']]));
    }

    public function test_matching_and_dragging_feedback_grades_each_submitted_pair_without_exposing_destinations(): void
    {
        foreach (['relacionar', 'arrastrar'] as $type) {
            $exercise = ['type' => $type, 'solution' => ['pares' => [['origen' => 'one', 'destino' => 'a'], ['origen' => 'two', 'destino' => 'b'], ['origen' => 'three', 'destino' => 'c']]]];
            $answer = ['pares' => [['origen' => 'two', 'destino' => 'c'], ['origen' => 'one', 'destino' => 'a']]];

            $this->assertSame(['item_results' => ['two' => false, 'one' => true]], ContratoEjercicio::itemResults($exercise, $answer));
        }
    }

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
