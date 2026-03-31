<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CourseTemplate extends Model
{
    protected $fillable = ['name', 'weeks', 'frequency', 'category_id'];

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function entries(): HasMany
    {
        return $this->hasMany(CourseTemplateEntry::class)->orderBy('sort_order');
    }

    public function classes(): HasMany
    {
        return $this->hasMany(CourseClass::class, 'course_template_id');
    }
}
