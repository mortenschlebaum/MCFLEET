<?php
namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'Bil',              'color' => '#3b82f6'],
            ['name' => 'MC',               'color' => '#ec4899'],
            ['name' => 'BE',               'color' => '#f97316'],
            ['name' => 'Trailer',          'color' => '#14b8a6'],
            ['name' => 'Opgraderingshold', 'color' => '#8b5cf6'],
        ];
        foreach ($categories as $c) {
            Category::firstOrCreate(['name' => $c['name']], $c);
        }
    }
}