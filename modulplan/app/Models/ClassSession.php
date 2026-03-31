<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClassSession extends Model
{
    protected $fillable = [
        'class_id', 'course_template_entry_id',
        'scheduled_date', 'actual_date',
        'start_time', 'end_time', 'duration_minutes',
        'status', 'conflict', 'move_reason',
    ];

    protected $casts = [
        'scheduled_date' => 'date',
        'actual_date'    => 'date',
        'conflict'       => 'boolean',
    ];

    public function courseClass(): BelongsTo
    {
        return $this->belongsTo(CourseClass::class, 'class_id');
    }

    public function templateEntry(): BelongsTo
    {
        return $this->belongsTo(CourseTemplateEntry::class, 'course_template_entry_id');
    }

    public function getEffectiveDateAttribute(): \Carbon\Carbon
    {
        return $this->actual_date ?? $this->scheduled_date;
    }
}
