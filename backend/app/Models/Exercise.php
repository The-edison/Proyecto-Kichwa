<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Exercise extends Model
{
    use SoftDeletes;
    protected $fillable = ['content_id', 'type', 'prompt', 'options', 'correct_answer', 'feedback_correct', 'feedback_incorrect', 'sort_order', 'is_published'];

    protected function casts(): array
    {
        return [
            'options' => 'array',
            'is_published' => 'boolean',
        ];
    }

    public function content(): BelongsTo
    {
        return $this->belongsTo(Content::class);
    }
}
