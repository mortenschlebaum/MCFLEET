<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class City extends Model
{
    protected $fillable = ['name', 'code'];

    public function classes(): HasMany
    {
        return $this->hasMany(CourseClass::class, 'city_id');
    }

    public function blockedDates(): HasMany
    {
        return $this->hasMany(BlockedDate::class, 'city_id');
    }
}
