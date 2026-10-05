<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EvaluationAttempt extends Model
{
    public const UPDATED_AT = null;
    protected $fillable = ['user_id', 'evaluation_id', 'score', 'correct_count', 'total_questions'];

    protected function casts(): array
    {
        return [
            'score' => 'decimal:2',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function evaluation(): BelongsTo
    {
        return $this->belongsTo(Evaluation::class);
    }

    public function answers(): HasMany
    {
        return $this->hasMany(EvaluationAttemptAnswer::class, 'evaluation_attempt_id');
    }
}
