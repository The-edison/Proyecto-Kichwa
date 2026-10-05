<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EvaluationAttemptAnswer extends Model
{
    public $timestamps = false;
    protected $fillable = ['evaluation_attempt_id', 'evaluation_question_id', 'submitted_answer', 'is_correct'];

    protected function casts(): array
    {
        return [
            'is_correct' => 'boolean',
        ];
    }

    public function attempt(): BelongsTo
    {
        return $this->belongsTo(EvaluationAttempt::class, 'evaluation_attempt_id');
    }

    public function question(): BelongsTo
    {
        return $this->belongsTo(EvaluationQuestion::class, 'evaluation_question_id');
    }
}
