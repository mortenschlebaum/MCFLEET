<?php

namespace App\Services;

use App\Models\BlockedDate;
use App\Models\ClassSession;
use App\Models\CourseClass;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class SessionGeneratorService
{
    public function generate(CourseClass $class): void
    {
        $class->sessions()->delete();

        $entries = $class->template->entries()->with('module')->get();
        $teachingDays = $class->teachingDays->pluck('day_of_week')->sort()->values();

        if ($teachingDays->isEmpty()) {
            return;
        }

        $blockedDates = BlockedDate::forCity($class->city_id)
            ->pluck('date')
            ->map(fn ($d) => Carbon::parse($d)->toDateString())
            ->flip();

        $dayStream = $this->buildDayStream(
            Carbon::parse($class->start_date),
            $teachingDays
        );

        $strategy = $class->holiday_strategy;
        $sessions = [];

        foreach ($entries as $entry) {
            if ($entry->type === 'pause') {
                for ($i = 0; $i < $entry->skip_slots; $i++) {
                    $dayStream->current();
                    $dayStream->next();
                }
                continue;
            }

            // Take the next slot from the stream
            $candidate = Carbon::parse($dayStream->current());
            $dayStream->next();

            $conflict = false;

            if (isset($blockedDates[$candidate->toDateString()])) {
                switch ($strategy) {
                    case 'next_valid':
                        // Find the next non-blocked teaching day
                        $candidate = $this->findNextValidDay($candidate, $blockedDates, $teachingDays);
                        // *** KEY FIX: advance the stream past the date we just chose,
                        // so the next module doesn't re-use the same slot. ***
                        while (
                            $dayStream->valid() &&
                            Carbon::parse($dayStream->current())->lte($candidate)
                        ) {
                            $dayStream->next();
                        }
                        break;

                    case 'flag':
                    case 'manual':
                        $conflict = true;
                        break;

                    case 'shift_all':
                        // Shift this slot to next valid day, then rebuild stream from there
                        $newStart = $this->findNextValidDay($candidate, $blockedDates, $teachingDays);
                        $dayStream = $this->buildDayStream($newStart, $teachingDays);
                        $candidate = Carbon::parse($dayStream->current());
                        $dayStream->next();
                        break;
                }
            }

            $duration  = $entry->module->default_duration_minutes ?? 0;
            $startTime = $class->start_time;
            $endTime   = $duration > 0
                ? Carbon::parse($class->start_date->toDateString() . ' ' . $startTime)
                      ->addMinutes($duration)
                      ->format('H:i:s')
                : $startTime;

            $sessions[] = [
                'class_id'                 => $class->id,
                'course_template_entry_id' => $entry->id,
                'scheduled_date'           => $candidate->toDateString(),
                'actual_date'              => null,
                'start_time'               => $startTime,
                'end_time'                 => $endTime,
                'duration_minutes'         => $duration,
                'status'                   => 'scheduled',
                'conflict'                 => $conflict,
                'move_reason'              => null,
                'created_at'               => now(),
                'updated_at'               => now(),
            ];
        }

        ClassSession::insert($sessions);
    }

    /**
     * Rebuild the day stream from $newDate and update all subsequent sessions
     * for $class to follow the teaching-day rhythm from that new anchor point.
     * Pause entries consume stream slots without creating sessions.
     * Blocked dates are skipped using findNextValidDay — same as shift_all.
     */
    public function shiftSubsequent(CourseClass $class, ClassSession $movedSession, string $newDate): void
    {
        $teachingDays = $class->teachingDays->pluck('day_of_week')->sort()->values();
        $blockedDates = BlockedDate::forCity($class->city_id)
            ->pluck('date')
            ->map(fn ($d) => Carbon::parse($d)->toDateString())
            ->flip();

        $allEntries     = $class->template->entries()->orderBy('sort_order')->get();
        $movedSortOrder = $allEntries->firstWhere('id', $movedSession->course_template_entry_id)?->sort_order ?? 0;
        $subsequentEntries = $allEntries->where('sort_order', '>', $movedSortOrder)->values();

        $sessionMap = $class->sessions()
            ->whereIn('course_template_entry_id', $subsequentEntries->pluck('id'))
            ->get()
            ->keyBy('course_template_entry_id');

        $dayStream = $this->buildDayStream(
            Carbon::parse($newDate)->addDay(),
            $teachingDays
        );

        foreach ($subsequentEntries as $entry) {
            if ($entry->type === 'pause') {
                for ($i = 0; $i < $entry->skip_slots; $i++) {
                    $dayStream->current();
                    $dayStream->next();
                }
                continue;
            }

            $candidate = Carbon::parse($dayStream->current());
            $dayStream->next();

            if (isset($blockedDates[$candidate->toDateString()])) {
                $candidate = $this->findNextValidDay($candidate, $blockedDates, $teachingDays);
                while ($dayStream->valid() && Carbon::parse($dayStream->current())->lte($candidate)) {
                    $dayStream->next();
                }
            }

            $session = $sessionMap->get($entry->id);
            if ($session) {
                $session->update([
                    'actual_date' => $candidate->toDateString(),
                    'status'      => 'moved',
                    'conflict'    => false,
                ]);
            }
        }
    }

    /**
     * Infinite generator yielding teaching-day dates starting from $startDate.
     * Yields only dates whose ISO day-of-week is in $teachingDays.
     */
    protected function buildDayStream(Carbon $startDate, Collection $teachingDays): \Generator
    {
        $current = $startDate->copy();

        // Snap to first teaching day on or after startDate
        while (!$teachingDays->contains((int) $current->isoFormat('E'))) {
            $current->addDay();
        }

        while (true) {
            yield $current->toDateString();
            $current->addDay();
            while (!$teachingDays->contains((int) $current->isoFormat('E'))) {
                $current->addDay();
            }
        }
    }

    /**
     * Find the next calendar date that is both a teaching day and not blocked.
     * Starts checking from $date itself (inclusive).
     */
    private function findNextValidDay(Carbon $date, Collection $blockedDates, Collection $teachingDays): Carbon
    {
        $candidate = $date->copy();

        while (
            isset($blockedDates[$candidate->toDateString()]) ||
            !$teachingDays->contains((int) $candidate->isoFormat('E'))
        ) {
            $candidate->addDay();
        }

        return $candidate;
    }
}