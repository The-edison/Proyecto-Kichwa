<?php

namespace App\Services;

class AnswerChecker
{
    public static function matches(string $submitted, string $expected): bool
    {
        return self::normalize($submitted) === self::normalize($expected);
    }

    private static function normalize(string $value): string
    {
        return mb_strtolower(preg_replace('/\s+/u', ' ', trim($value)));
    }
}
