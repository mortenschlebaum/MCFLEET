<?php
namespace Database\Seeders;

use App\Models\CourseTemplate;
use App\Models\CourseTemplateEntry;
use App\Models\Module;
use Illuminate\Database\Seeder;

class CourseTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $order = ['MOD1', 'MOD2', 'INGEN_TEORI', 'MOD3_1', 'MOD3_2', 'MOD4_1', 'MOD4_2', 'INGEN_TEORI'];
        $modules = Module::whereIn('code', array_unique($order))->get()->keyBy('code');

        // 4-week template: 2 sessions/week
        $t4 = CourseTemplate::firstOrCreate(
            ['name' => '4 ugers hold'],
            ['weeks' => 4, 'frequency' => 2]
        );
        $t4->entries()->delete();
        foreach ($order as $i => $code) {
            CourseTemplateEntry::create([
                'course_template_id' => $t4->id,
                'sort_order'         => $i + 1,
                'type'               => 'module',
                'module_id'          => $modules[$code]->id,
                'skip_slots'         => 0,
            ]);
        }

        // 8-week template: 1 session/week
        $t8 = CourseTemplate::firstOrCreate(
            ['name' => '8 ugers hold'],
            ['weeks' => 8, 'frequency' => 1]
        );
        $t8->entries()->delete();
        foreach ($order as $i => $code) {
            CourseTemplateEntry::create([
                'course_template_id' => $t8->id,
                'sort_order'         => $i + 1,
                'type'               => 'module',
                'module_id'          => $modules[$code]->id,
                'skip_slots'         => 0,
            ]);
        }
    }
}