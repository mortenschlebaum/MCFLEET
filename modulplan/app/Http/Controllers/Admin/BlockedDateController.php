<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\BlockedDate;
use App\Models\City;
use App\Services\DanishHolidayService;
use Illuminate\Http\Request;

class BlockedDateController extends Controller
{
    public function index()
    {
        $cities = City::orderBy('name')->get();

        $holidays = BlockedDate::with('city')
            ->where('type', 'holiday')
            ->orderBy('date')
            ->get()
            ->groupBy(fn ($b) => $b->date->year);

        $vacations = BlockedDate::with('city')
            ->where('type', 'vacation')
            ->orderBy('date')
            ->get()
            ->groupBy(fn ($b) => $b->date->year);

        return view('admin.blocked-dates.index', compact('cities', 'holidays', 'vacations'));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'type'     => 'required|in:holiday,vacation',
            'name'     => 'required|string|max:100',
            'date'     => 'required|date',
            'date_to'  => 'nullable|date|after_or_equal:date',
            'city_id'  => 'nullable|exists:cities,id',
            'category' => 'nullable|in:Vinterferie,Påskeferie,Sommerferie,Efterårsferie,Juleferie',
        ]);

        if ($data['type'] === 'holiday') {
            $data['category'] = null;
        }

        $dates = [];
        $start = \Carbon\Carbon::parse($data['date']);
        $end   = isset($data['date_to']) && $data['date_to']
            ? \Carbon\Carbon::parse($data['date_to'])
            : $start->copy();

        $current = $start->copy();
        while ($current->lte($end)) {
            $dates[] = [
                'city_id'    => $data['city_id'] ?? null,
                'date'       => $current->toDateString(),
                'name'       => $data['name'],
                'type'       => $data['type'],
                'category'   => $data['category'] ?? null,
                'created_at' => now(),
                'updated_at' => now(),
            ];
            $current->addDay();
        }

        BlockedDate::insert($dates);

        $count = count($dates);
        $label = $data['type'] === 'holiday' ? 'Helligdag' : 'Ferie';
        $msg   = $count === 1
            ? "$label tilføjet."
            : "$label tilføjet ($count dage).";

        return back()->with('success', $msg);
    }

    public function destroy(BlockedDate $blockedDate)
    {
        $blockedDate->delete();
        return back()->with('success', 'Slettet.');
    }

    public function destroyRange(Request $request)
    {
        $data = $request->validate([
            'ids'   => 'required|array|min:1',
            'ids.*' => 'integer|exists:blocked_dates,id',
        ]);

        $count = BlockedDate::whereIn('id', $data['ids'])->delete();

        return back()->with('success', $count . ' dag(e) slettet.');
    }

    /**
     * Import all Danish public holidays for a given year.
     * Skips dates that already exist (same date + city_id null) to avoid duplicates.
     */
    public function importYear(Request $request, DanishHolidayService $service)
    {
        $data = $request->validate([
            'year' => 'required|integer|min:1990|max:2100',
        ]);

        $year = (int) $data['year'];
        $holidays = $service->forYear($year);

        // Find existing dates for this year to avoid duplicates
        $existing = BlockedDate::whereYear('date', $year)
            ->whereNull('city_id')
            ->where('type', 'holiday')
            ->pluck('date')
            ->map(fn ($d) => \Carbon\Carbon::parse($d)->toDateString())
            ->flip();

        $imported = 0;
        foreach ($holidays as $h) {
            $dateStr = $h['date']->toDateString();
            if (isset($existing[$dateStr])) continue;

            BlockedDate::create([
                'city_id'  => null,
                'date'     => $dateStr,
                'name'     => $h['name'],
                'type'     => 'holiday',
                'category' => null,
            ]);
            $imported++;
        }

        $skipped = count($holidays) - $imported;
        $msg = $imported . ' helligdage importeret for ' . $year;
        if ($skipped > 0) $msg .= " ($skipped sprunget over – allerede registreret)";

        return back()->with('success', $msg);
    }
}