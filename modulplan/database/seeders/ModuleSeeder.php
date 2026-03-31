<?php
namespace Database\Seeders;

use App\Models\Module;
use Illuminate\Database\Seeder;

class ModuleSeeder extends Seeder
{
    public function run(): void
    {
        $modules = [
            ['name' => 'Modul 1',      'code' => 'MOD1',        'default_duration_minutes' => 180, 'color' => '#3b82f6'],
            ['name' => 'Modul 2',      'code' => 'MOD2',        'default_duration_minutes' => 180, 'color' => '#8b5cf6'],
            ['name' => 'Modul 3.1',    'code' => 'MOD3_1',      'default_duration_minutes' => 180, 'color' => '#ec4899'],
            ['name' => 'Modul 3.2',    'code' => 'MOD3_2',      'default_duration_minutes' => 180, 'color' => '#f97316'],
            ['name' => 'Modul 4.1',    'code' => 'MOD4_1',      'default_duration_minutes' => 180, 'color' => '#14b8a6'],
            ['name' => 'Modul 4.2',    'code' => 'MOD4_2',      'default_duration_minutes' => 180, 'color' => '#84cc16'],
            ['name' => 'Ingen teori',  'code' => 'INGEN_TEORI', 'default_duration_minutes' => 0,   'color' => '#d1d5db'],
        ];

        foreach ($modules as $m) {
            $mod = Module::firstOrCreate(['code' => $m['code']], $m);
            // Update color if module already existed
            $mod->update(['color' => $m['color'], 'name' => $m['name'], 'default_duration_minutes' => $m['default_duration_minutes']]);
        }
    }
}