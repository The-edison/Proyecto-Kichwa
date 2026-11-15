<?php

namespace App\Services;

use Illuminate\Support\Str;

class PuntajeComentario
{
    public function sanitize(string $text): string
    {
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = preg_replace('~<(script|style)\b[^>]*>.*?</\1\s*>~isu', ' ', $text) ?? $text;
        $text = strip_tags($text);

        return trim(preg_replace('/[\p{C}\s]+/u', ' ', $text) ?? '');
    }

    private function normalize(string $text): string
    {
        return trim(preg_replace('/[^a-z0-9]+/', ' ', Str::lower(Str::ascii($text))) ?? '');
    }

    private function alternatives(array $words): string
    {
        return implode('|', array_map(fn (string $word): string => preg_quote($this->normalize($word), '~'), $words));
    }

    /** @return array{puntaje: int, excluido: bool} */
    public function calculate(string $text): array
    {
        $normalized = $this->normalize($text);
        $score = 0;
        $excluded = false;
        $negations = $this->alternatives(config('comentarios.negaciones'));
        $connectors = $this->alternatives(config('comentarios.conectores_negacion'));

        foreach (['positivas' => 1, 'negativas' => -2, 'prohibidas' => 0] as $list => $weight) {
            foreach (array_unique(array_map($this->normalize(...), config('comentarios.'.$list))) as $phrase) {
                if ($phrase === '') {
                    continue;
                }
                preg_match_all('~\b'.preg_quote($phrase, '~').'\b~', $normalized, $matches, PREG_OFFSET_CAPTURE);
                foreach ($matches[0] as [$match, $offset]) {
                    if ($list === 'prohibidas') {
                        $excluded = true;
                    } elseif ($weight < 0 || ! preg_match('~\b(?:'.$negations.')(?:\s+(?:'.$connectors.')){0,3}\s+$~', substr($normalized, 0, $offset))) {
                        $score += $weight;
                    }
                }
            }
        }
        foreach (config('comentarios.patrones_spam') as $pattern) {
            if (preg_match($pattern, $text)) {
                $excluded = true;
            }
        }

        return ['puntaje' => $score, 'excluido' => $excluded];
    }
}
