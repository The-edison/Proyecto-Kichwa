<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EvaluationQuestion extends Model
{
    protected $fillable = ['evaluation_id', 'type', 'prompt', 'options', 'correct_answer', 'feedback_correct', 'feedback_incorrect', 'sort_order'];

    protected function casts(): array
    {
        return [
            'options' => 'array',
        ];
    }

    public function evaluation(): BelongsTo
    {
        return $this->belongsTo(Evaluation::class);
    }
}
