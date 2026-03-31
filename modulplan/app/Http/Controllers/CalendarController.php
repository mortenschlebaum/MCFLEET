<?php
namespace App\Http\Controllers;

use App\Models\BlockedDate;
use App\Models\Category;
use App\Models\City;
use App\Models\ClassSession;
use App\Models\CourseClass;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Http\Request;

class CalendarController extends Controller
{
    public function index(Request $request)
    {
        $cityId     = $request->query('city');
        $classId    = $request->query('class');
        $categoryId = $request->query('category');
        $view       = $request->query('view', 'list');
        $months     = (int) $request->query('months', 2);
        $months     = max(1, min(3, $months));

        $startParam = $request->query('start');
        $start = $startParam ? Carbon::parse($startParam)->startOfMonth() : Carbon::today()->startOfMonth();
        $end   = $start->copy()->addMonths($months)->endOfMonth();

        $sessionsQuery = ClassSession::with(['courseClass.city', 'courseClass.categories', 'courseClass', 'templateEntry.module'])
            ->where(function ($q) use ($start, $end) {
                $q->whereBetween('scheduled_date', [$start->toDateString(), $end->toDateString()])
                  ->orWhereBetween('actual_date', [$start->toDateString(), $end->toDateString()]);
            })
            ->orderBy('scheduled_date')
            ->orderBy('start_time');

        if ($cityId) {
            $sessionsQuery->whereHas('courseClass', fn ($q) => $q->where('city_id', $cityId));
        }
        if ($classId) {
            $sessionsQuery->where('class_id', $classId);
        }
        if ($categoryId) {
            $sessionsQuery->whereHas('courseClass.categories', fn ($q) => $q->where('categories.id', $categoryId));
        }

        $sessions = $sessionsQuery->get()->groupBy(
            fn ($s) => $s->actual_date
                ? Carbon::parse($s->actual_date)->toDateString()
                : Carbon::parse($s->scheduled_date)->toDateString()
        );

        $blockedQuery = BlockedDate::whereBetween('date', [$start->toDateString(), $end->toDateString()]);
        if ($cityId) {
            $blockedQuery->where(fn ($q) => $q->whereNull('city_id')->orWhere('city_id', $cityId));
        }
        $blocked = $blockedQuery->get()->groupBy(
            fn ($b) => Carbon::parse($b->date)->toDateString()
        );

        $days = [];
        $period = CarbonPeriod::create($start, $end);
        foreach ($period as $day) {
            $dateStr = $day->toDateString();
            $days[] = [
                'date'     => $day->copy(),
                'sessions' => $sessions[$dateStr] ?? collect(),
                'blocked'  => $blocked[$dateStr] ?? collect(),
            ];
        }

        $calendarEvents = [];
        foreach ($sessions->collapse() as $session) {
            $effectiveDate = $session->actual_date
                ? Carbon::parse($session->actual_date)->toDateString()
                : Carbon::parse($session->scheduled_date)->toDateString();

            // Color: primary category > module color
            $color = $session->courseClass->categories->first()?->color
                  ?? $session->templateEntry->module?->color
                  ?? '#6b7280';

            $calendarEvents[] = [
                'id'    => $session->id,
                'title' => ($session->templateEntry->module->code ?? '?') . ' — ' . $session->courseClass->name,
                'start' => $effectiveDate . 'T' . $session->start_time,
                'end'   => $effectiveDate . 'T' . $session->end_time,
                'color' => $color,
                'extendedProps' => [
                    'conflict'  => $session->conflict,
                    'city'      => $session->courseClass->city->name ?? '',
                    'class'     => $session->courseClass->name,
                    'sessionId' => $session->id,
                    'classId'   => $session->class_id,
                ],
            ];
        }

        foreach ($blocked->collapse() as $b) {
            $calendarEvents[] = [
                'title'   => $b->name,
                'start'   => Carbon::parse($b->date)->toDateString(),
                'allDay'  => true,
                'color'   => $b->type === 'holiday' ? '#fbbf24' : '#34d399',
                'display' => 'background',
            ];
        }

        $cities     = City::orderBy('name')->get();
        $classes    = CourseClass::with('city')->orderBy('name')->get();
        $categories = Category::orderBy('name')->get();

        return view('calendar.index', compact(
            'days', 'start', 'end', 'view', 'months',
            'cities', 'classes', 'categories', 'cityId', 'classId', 'categoryId',
            'calendarEvents', 'blocked'
        ));
    }
}