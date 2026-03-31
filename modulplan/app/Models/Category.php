<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Category extends Model
{
    protected $fillable = ['name', 'color'];

    public function classes(): BelongsToMany
    {
        return $this->belongsToMany(CourseClass::class, 'class_categories', 'category_id', 'class_id');
    }

    public function modules(): HasMany
    {
        return $this->hasMany(Module::class);
    }

    public function templates(): HasMany
    {
        return $this->hasMany(CourseTemplate::class);
    }
}