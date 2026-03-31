<div class="flex items-center justify-between mb-3">
    <div class="flex gap-2 items-center">
        <a href="{{ request()->fullUrlWithQuery(['start' => $start->copy()->subMonths($months)->startOfMonth()->toDateString()]) }}"
           class="px-3 py-1.5 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50">← Tilbage</a>
        <a href="{{ request()->fullUrlWithQuery(['start' => now()->startOfMonth()->toDateString()]) }}"
           class="px-3 py-1.5 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50">I dag</a>
        <a href="{{ request()->fullUrlWithQuery(['start' => $start->copy()->addMonths($months)->toDateString()]) }}"
           class="px-3 py-1.5 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50">Frem →</a>
    </div>
    <span class="text-sm text-gray-500">
        {{ $start->translatedFormat('F Y') }} – {{ $end->translatedFormat('F Y') }}
    </span>
</div>

<div class="flex gap-4 text-xs mb-3 text-gray-600">
    <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-yellow-100 border border-yellow-300 inline-block"></span> Helligdag</span>
    <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-green-100 border border-green-300 inline-block"></span> Ferie</span>
    <span class="flex items-center gap-1"><span class="text-orange-500">⚠</span> Konflikt</span>
</div>

<div class="bg-white rounded-lg shadow overflow-hidden">
    <table class="w-full text-sm">
        <thead>
            <tr class="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 tracking-wide">
                <th class="px-3 py-2 text-left w-10">Uge</th>
                <th class="px-3 py-2 text-left w-24">Dag</th>
                <th class="px-3 py-2 text-left w-24">Dato</th>
                <th class="px-3 py-2 text-left w-20">Tid</th>
                <th class="px-3 py-2 text-left">Modul</th>
                <th class="px-3 py-2 text-left">Hold</th>
                <th class="px-3 py-2 text-left">By</th>
                <th class="px-3 py-2 text-left w-20">Varighed</th>
                <th class="px-3 py-2 text-left w-24">Status</th>
                <th class="px-3 py-2 w-10"></th>
            </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
        @forelse($days as $day)
            @php
                $dateStr    = $day['date']->toDateString();
                $sessions   = $day['sessions'];
                $blockedDay = $day['blocked'];
                $isHoliday  = $blockedDay->where('type','holiday')->isNotEmpty();
                $isVacation = $blockedDay->where('type','vacation')->isNotEmpty();
                $isWeekend  = $day['date']->isWeekend();
                $rowBg      = $isHoliday ? 'bg-yellow-50' : ($isVacation ? 'bg-green-50' : ($isWeekend ? 'bg-gray-100' : ''));
                $dayName    = $day['date']->locale('da')->isoFormat('dddd');
                $weekNum    = $day['date']->isoWeek();
            @endphp

            @if($sessions->isEmpty())
                <tr class="{{ $rowBg }} hover:bg-gray-50 transition">
                    <td class="px-3 py-2 text-gray-400 text-xs">{{ $weekNum }}</td>
                    <td class="px-3 py-2 capitalize {{ $isWeekend ? 'text-gray-400' : 'text-gray-500' }}">{{ $dayName }}</td>
                    <td class="px-3 py-2 text-gray-500">{{ $day['date']->format('d/m') }}</td>
                    <td class="px-3 py-2"></td>
                    <td class="px-3 py-2 text-gray-300 italic text-xs" colspan="4">
                        @if($isHoliday) {{ $blockedDay->where('type','holiday')->first()?->name }}
                        @elseif($isVacation) {{ $blockedDay->where('type','vacation')->first()?->name }}
                        @else —
                        @endif
                    </td>
                    <td class="px-3 py-2">
                        @if(!$isHoliday && !$isVacation)
                            <a href="/admin/classes/create?date={{ $dateStr }}"
                               class="text-xs text-blue-600 hover:text-blue-800 whitespace-nowrap">+ hold</a>
                        @endif
                    </td>
                </tr>
            @else
                @foreach($sessions as $i => $session)
                    @php
                        $module      = $session->templateEntry->module ?? null;
                        $primaryCat  = $session->courseClass->categories->first();
                        $catColor    = $primaryCat?->color ?? ($module?->color ?? '#6b7280');
                        $leftBorder  = "border-l-4";
                    @endphp
                    <tr x-data="{ showDetail: false }"
                        class="{{ $rowBg }} hover:bg-blue-50 transition cursor-pointer {{ $leftBorder }}"
                        style="border-left-color: {{ $catColor }}"
                        @click="showDetail = true">
                        <td class="px-3 py-2 text-gray-400 text-xs">{{ $i === 0 ? $weekNum : '' }}</td>
                        <td class="px-3 py-2 capitalize {{ $i === 0 ? '' : 'text-gray-300' }}">{{ $i === 0 ? $dayName : '' }}</td>
                        <td class="px-3 py-2 {{ $i === 0 ? '' : 'text-gray-300' }}">{{ $i === 0 ? $day['date']->format('d/m') : '' }}</td>
                        <td class="px-3 py-2 text-gray-600">{{ \Illuminate\Support\Str::substr($session->start_time, 0, 5) }}</td>
                        <td class="px-3 py-2 font-medium">
                            @if($module)
                                <span class="inline-block px-2 py-0.5 rounded text-white text-xs"
                                      style="background: {{ $module->color }}">
                                    {{ $module->code }}
                                </span>
                                <span class="ml-1 text-gray-700">{{ $module->name }}</span>
                            @else —
                            @endif
                        </td>
                        <td class="px-3 py-2 text-gray-700">
                            {{ $session->courseClass->name }}
                            @if($primaryCat)
                                <span class="ml-1 text-xs px-1.5 py-0.5 rounded-full text-white"
                                      style="background: {{ $catColor }}">{{ $primaryCat->name }}</span>
                            @endif
                        </td>
                        <td class="px-3 py-2 text-gray-500">{{ $session->courseClass->city->name ?? '—' }}</td>
                        <td class="px-3 py-2 text-gray-500">{{ $session->duration_minutes }} min</td>
                        <td class="px-3 py-2">
                            @if($session->conflict)
                                <span class="text-orange-500 font-semibold">⚠ Konflikt</span>
                            @elseif($session->status === 'moved')
                                <span class="text-blue-500 text-xs">Flyttet</span>
                            @elseif($session->status === 'completed')
                                <span class="text-green-600 text-xs">✓</span>
                            @else
                                <span class="text-gray-400 text-xs">Planlagt</span>
                            @endif
                        </td>
                        <td class="px-3 py-2 text-right">
                            @include('components.session-detail', ['session' => $session])
                        </td>
                    </tr>
                @endforeach
            @endif
        @empty
            <tr><td colspan="10" class="px-4 py-8 text-center text-gray-400">Ingen dage at vise</td></tr>
        @endforelse
        </tbody>
    </table>
</div>