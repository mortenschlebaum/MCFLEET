<?php
require __DIR__ . "/vendor/autoload.php";
$app = require __DIR__ . "/bootstrap/app.php";
$app->make("Illuminate\Contracts\Console\Kernel")->bootstrap();

use App\Models\CourseClass;
use App\Services\SessionGeneratorService;

$class = CourseClass::with(["teachingDays","template"])->first();
if (!$class) { echo "No class found\n"; exit; }

echo "Class: " . $class->name . "\n";
echo "Teaching days: " . $class->teachingDays->pluck("day_of_week")->implode(", ") . "\n";
echo "Strategy: " . $class->holiday_strategy . "\n\n";

(new SessionGeneratorService)->generate($class);

$sessions = $class->fresh()->sessions()->with("templateEntry.module")->orderBy("scheduled_date")->get();
foreach ($sessions as $s) {
    echo $s->scheduled_date . " " . $s->start_time . "  " . ($s->templateEntry->module->code ?? "?") . "\n";
}
