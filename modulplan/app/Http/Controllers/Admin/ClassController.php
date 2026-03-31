<?php
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\City;
use App\Models\CourseClass;
use App\Models\CourseTemplate;
use App\Services\SessionGeneratorService;
use Carbon\Carbon;
use Illuminate\Http\Request;

class ClassController extends Controller
{
    public function index()
    {
        $classes = CourseClass::with(['city', 'template', 'categories'])
            ->orderBy('start_date', 'desc')
            ->get();
        return view('admin.classes.index', compact('classes'));
    }

    public function create(Request $request)
    {
        $cities     = City::orderBy('name')->get();
        $templates  = CourseTemplate::with('category')->orderBy('name')->get();
        $categories = Category::orderBy('name')->get();
        $templatesByCategory = $templates->groupBy(fn ($t) => $t->category?->name ?? 'Uden kategori');
        $prefillDate = $request->query('date');
        return view('admin.classes.create', compact('cities', 'templates', 'categories', 'templatesByCategory', 'prefillDate'));
    }

    public function store(Request $request, SessionGeneratorService $generator)
    {
        $data = $request->validate([
            'city_id'            => 'required|exists:cities,id',
            'course_template_id' => 'required|exists:course_templates,id',
            'start_date'         => 'required|date',
            'start_time'         => 'required',
            'teaching_days'      => 'required|array|min:1',
            'teaching_days.*'    => 'integer|between:1,7',
            'holiday_strategy'   => 'required|in:next_valid,flag,manual,shift_all',
            'category_ids'       => 'nullable|array',
            'category_ids.*'     => 'exists:categories,id',
            'series_end_date'    => 'nullable|date|after:start_date',
        ]);

        $template = CourseTemplate::findOrFail($data['course_template_id']);

        $startDates = $this->buildSeriesStartDates(
            Carbon::parse($data['start_date']),
            $data['teaching_days'],
            $template,
            isset($data['series_end_date']) ? Carbon::parse($data['series_end_date']) : null
        );

        foreach ($startDates as $startDate) {
            $class = CourseClass::create([
                'city_id'            => $data['city_id'],
                'course_template_id' => $data['course_template_id'],
                'name'               => $template->name,
                'start_date'         => $startDate->toDateString(),
                'start_time'         => $data['start_time'],
                'frequency'          => $template->frequency,
                'holiday_strategy'   => $data['holiday_strategy'],
                'status'             => 'active',
            ]);

            foreach ($data['teaching_days'] as $day) {
                $class->teachingDays()->create(['day_of_week' => $day]);
            }

            if (!empty($data['category_ids'])) {
                $class->categories()->sync($data['category_ids']);
            }

            $generator->generate($class);
        }

        return redirect()->route('admin.classes.index')
            ->with('success', count($startDates) . ' hold oprettet.');
    }

    public function edit(CourseClass $class)
    {
        $cities     = City::orderBy('name')->get();
        $templates  = CourseTemplate::with('category')->orderBy('name')->get();
        $categories = Category::orderBy('name')->get();
        $templatesByCategory = $templates->groupBy(fn ($t) => $t->category?->name ?? 'Uden kategori');
        $class->load('categories');
        return view('admin.classes.edit', compact('class', 'cities', 'templates', 'categories', 'templatesByCategory'));
    }

    public function update(Request $request, CourseClass $class, SessionGeneratorService $generator)
    {
        $data = $request->validate([
            'city_id'          => 'required|exists:cities,id',
            'start_date'       => 'required|date',
            'start_time'       => 'required',
            'teaching_days'    => 'required|array|min:1',
            'teaching_days.*'  => 'integer|between:1,7',
            'holiday_strategy' => 'required|in:next_valid,flag,manual,shift_all',
            'status'           => 'required|in:active,completed,cancelled',
            'category_ids'     => 'nullable|array',
            'category_ids.*'   => 'exists:categories,id',
        ]);

        $class->update([
            'city_id'          => $data['city_id'],
            'start_date'       => $data['start_date'],
            'start_time'       => $data['start_time'],
            'holiday_strategy' => $data['holiday_strategy'],
            'status'           => $data['status'],
        ]);

        $class->teachingDays()->delete();
        foreach ($data['teaching_days'] as $day) {
            $class->teachingDays()->create(['day_of_week' => $day]);
        }

        $class->categories()->sync($data['category_ids'] ?? []);
        $generator->generate($class);

        return redirect()->route('admin.classes.index')
            ->with('success', 'Hold opdateret og sessioner regenereret.');
    }

    public function destroy(CourseClass $class)
    {
        $class->delete();
        return redirect()->route('admin.classes.index')->with('success', 'Hold slettet.');
    }

    public function regenerate(CourseClass $class, SessionGeneratorService $generator)
    {
        $generator->generate($class);
        return back()->with('success', 'Sessionsplan regenereret.');
    }

    public function previewSeries(Request $request)
    {
        $data = $request->validate([
            'start_date'         => 'required|date',
            'course_template_id' => 'required|exists:course_templates,id',
            'teaching_days'      => 'required|array|min:1',
            'series_end_date'    => 'required|date|after:start_date',
        ]);

        $template = CourseTemplate::find($data['course_template_id']);
        $dates = $this->buildSeriesStartDates(
            Carbon::parse($data['start_date']),
            $data['teaching_days'],
            $template,
            Carbon::parse($data['series_end_date'])
        );

        return response()->json([
            'count' => count($dates),
            'dates' => array_map(fn ($d) => $d->format('d/m/Y'), $dates),
        ]);
    }

    private function buildSeriesStartDates(Carbon $start, array $teachingDays, CourseTemplate $template, ?Carbon $seriesEnd): array
    {
        $dates = [$start->copy()];
        if (!$seriesEnd) return $dates;

        $current = $start->copy();
        while (true) {
            $nextStart = $current->copy()->addWeeks($template->weeks);
            $days = collect($teachingDays)->sort()->values();
            while (!$days->contains((int) $nextStart->isoFormat('E'))) {
                $nextStart->addDay();
            }
            if ($nextStart->gt($seriesEnd)) break;
            $dates[] = $nextStart->copy();
            $current = $nextStart;
        }

        return $dates;
    }
}