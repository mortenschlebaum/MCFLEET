<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CourseClass extends Model
{
    protected $table = 'classes';

    protected $fillable = [
        'city_id', 'course_template_id', 'name',
        'start_date', 'start_time', 'frequency',
        'holiday_strategy', 'status',
    ];

    protected $casts = [
        'start_date' => 'date',
    ];

    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class);
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(CourseTemplate::class, 'course_template_id');
    }

    public function teachingDays(): HasMany
    {
        return $this->hasMany(ClassTeachingDay::class, 'class_id')->orderBy('day_of_week');
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(ClassSession::class, 'class_id')->orderBy('scheduled_date');
    }

    public function categories(): BelongsToMany
    {
        return $this->belongsToMany(Category::class, 'class_categories', 'class_id', 'category_id');
    }

    /**
     * Returns the primary color from the first attached category,
     * or a neutral fallback.
     */
    public function getPrimaryColorAttribute(): string
    {
        return $this->categories->first()?->color ?? '#6b7280';
    }
}