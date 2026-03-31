<?php

namespace App\Services;

use Carbon\Carbon;

class DanishHolidayService
{
    /**
     * Returns all Danish public holidays for a given year as an array of
     * ['name' => string, 'date' => Carbon] entries.
     *
     * Store Bededag was abolished as of 2024 and is not included from that year.
     */
    public function forYear(int $year): array
    {
        $easter = $this->easterSunday($year);
        $holidays = [];

        // Fixed holidays
        $holidays[] = ['name' => 'Nytårsdag',   'date' => Carbon::create($year, 1, 1)];
        $holidays[] = ['name' => 'Grundlovsdag', 'date' => Carbon::create($year, 6, 5)];
        $holidays[] = ['name' => '1. juledag',   'date' => Carbon::create($year, 12, 25)];
        $holidays[] = ['name' => '2. juledag',   'date' => Carbon::create($year, 12, 26)];

        // Easter-relative holidays
        $holidays[] = ['name' => 'Skærtorsdag',           'date' => $easter->copy()->subDays(3)];
        $holidays[] = ['name' => 'Langfredag',             'date' => $easter->copy()->subDays(2)];
        $holidays[] = ['name' => '1. påskedag',            'date' => $easter->copy()];
        $holidays[] = ['name' => '2. påskedag',            'date' => $easter->copy()->addDays(1)];
        $holidays[] = ['name' => 'Kristi himmelfartsdag',  'date' => $easter->copy()->addDays(39)];
        $holidays[] = ['name' => '1. pinsedag',            'date' => $easter->copy()->addDays(49)];
        $holidays[] = ['name' => '2. pinsedag',            'date' => $easter->copy()->addDays(50)];

        // Store bededag — abolished from 2024
        if ($year < 2024) {
            $holidays[] = ['name' => 'Store bededag', 'date' => $easter->copy()->addDays(26)];
        }

        usort($holidays, fn ($a, $b) => $a['date']->timestamp <=> $b['date']->timestamp);

        return $holidays;
    }

    /**
     * Calculate Easter Sunday using the Anonymous Gregorian algorithm.
     */
    private function easterSunday(int $year): Carbon
    {
        $a = $year % 19;
        $b = intdiv($year, 100);
        $c = $year % 100;
        $d = intdiv($b, 4);
        $e = $b % 4;
        $f = intdiv($b + 8, 25);
        $g = intdiv($b - $f + 1, 3);
        $h = (19 * $a + $b - $d - $g + 15) % 30;
        $i = intdiv($c, 4);
        $k = $c % 4;
        $l = (32 + 2 * $e + 2 * $i - $h - $k) % 7;
        $m = intdiv($a + 11 * $h + 22 * $l, 451);
        $month = intdiv($h + $l - 7 * $m + 114, 31);
        $day   = (($h + $l - 7 * $m + 114) % 31) + 1;

        return Carbon::create($year, $month, $day);
    }
}