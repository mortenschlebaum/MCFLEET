<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BlockedDate extends Model
{
    protected $fillable = ['city_id', 'date', 'name', 'type', 'category'];

    protected $casts = [
        'date' => 'date',
    ];

    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class);
    }

    public function scopeForCity(\Illuminate\Database\Eloquent\Builder $query, ?int $cityId): \Illuminate\Database\Eloquent\Builder
    {
        return $query->where(function ($q) use ($cityId) {
            $q->whereNull('city_id');
            if ($cityId) {
                $q->orWhere('city_id', $cityId);
            }
        });
    }
}
