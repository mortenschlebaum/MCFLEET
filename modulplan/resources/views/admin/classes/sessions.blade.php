@extends('layouts.app')
@section('title', 'Sessioner — ' . $class->name)

@section('content')
<div class="flex flex-wrap items-center justify-between gap-3 mb-6">
    <div class="flex items-center gap-3">
        <a href="{{ route('admin.classes.index') }}" class="text-gray-500 hover:text-gray-700">← Hold</a>
        <h1 class="text-2xl font-bold text-gray-800">{{ $class->name }}</h1>
        <span class="text-sm text-gray-500">{{ $class->city->name ?? '' }} · Start {{ $class->start_date->format('d/m/Y') }}</span>
    </div>
    <form method="POST" action="{{ route('admin.classes.sessions.regenerate', $class) }}">
        @csrf
        <button type="submit" class="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm">
            ↺ Regenerér plan
        </button>
    </form>
</div>

<div class="bg-white rounded-lg shadow overflow-hidden">
    <table class="w-full text-sm">
        <thead>
            <tr class="bg-gray-50 border-b text-xs uppercase text-gray-500 tracking-wide">
                <th class="px-4 py-3 text-left">#</th>
                <th class="px-4 py-3 text-left">Modul</th>
                <th class="px-4 py-3 text-left">Planlagt dato</th>
                <th class="px-4 py-3 text-left">Faktisk dato</th>
                <th class="px-4 py-3 text-left">Tid</th>
                <th class="px-4 py-3 text-left">Varighed</th>
                <th class="px-4 py-3 text-left">Status</th>
                <th class="px-4 py-3"></th>
            </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
        @forelse($sessions as $i => $session)
            @php $module = $session->templateEntry->module ?? null; @endphp
            <tr x-data="{ moving: false }" class="{{ $session->conflict ? 'bg-orange-50' : 'hover:bg-gray-50' }} transition">
                <td class="px-4 py-3 text-gray-400 text-xs">{{ $i + 1 }}</td>
                <td class="px-4 py-3 font-medium">
                    @if($module)
                        <span class="inline-block px-2 py-0.5 rounded text-white text-xs"
                              style="background:{{ ['MOD1'=>'#3b82f6','MOD2'=>'#8b5cf6','MOD3_1'=>'#ec4899','MOD3_2'=>'#f97316','MOD4_1'=>'#14b8a6','MOD4_2'=>'#84cc16'][$module->code] ?? '#6b7280' }}">
                            {{ $module->code }}
                        </span>
                        {{ $module->name }}
                    @else —
                    @endif
                </td>
                <td class="px-4 py-3 text-gray-700">{{ $session->scheduled_date->format('d/m/Y') }}</td>
                <td class="px-4 py-3 text-gray-500">{{ $session->actual_date?->format('d/m/Y') ?? '—' }}</td>
                <td class="px-4 py-3 text-gray-600">{{ \Illuminate\Support\Str::substr($session->start_time,0,5) }}</td>
                <td class="px-4 py-3 text-gray-500">{{ $session->duration_minutes }} min</td>
                <td class="px-4 py-3">
                    @if($session->conflict)
                        <span class="text-orange-600 font-semibold text-xs">⚠ Konflikt</span>
                    @elseif($session->status === 'moved')
                        <span class="text-blue-600 text-xs" title="{{ $session->move_reason }}">Flyttet</span>
                    @else
                        <span class="text-gray-400 text-xs">{{ ucfirst($session->status) }}</span>
                    @endif
                </td>
                <td class="px-4 py-3 text-right">
                    <button @click="moving = !moving" class="text-xs text-blue-600 hover:text-blue-800">Flyt</button>
                    {{-- Move form --}}
                    <div x-show="moving" x-cloak class="mt-2">
                        <form method="POST"
                              action="{{ route('admin.classes.sessions.move', [$class, $session]) }}"
                              class="flex gap-2 items-end justify-end flex-wrap">
                            @csrf
                            <div>
                                <label class="block text-xs text-gray-500 mb-0.5">Ny dato</label>
                                <input type="date" name="new_date" required
                                       value="{{ $session->actual_date?->toDateString() ?? $session->scheduled_date->toDateString() }}"
                                       class="border border-gray-300 rounded px-2 py-1 text-xs">
                            </div>
                            <div>
                                <label class="block text-xs text-gray-500 mb-0.5">Årsag</label>
                                <input type="text" name="move_reason" placeholder="Valgfri årsag"
                                       class="border border-gray-300 rounded px-2 py-1 text-xs w-40">
                            </div>
                            <div class="w-full flex justify-end mt-1">
                                <label class="flex items-center gap-1.5 cursor-pointer">
                                    <input type="checkbox" name="shift_subsequent" value="1"
                                           class="rounded border-gray-300 text-blue-600">
                                    <span class="text-xs text-gray-600">Ryk også efterfølgende sessioner tilsvarende</span>
                                </label>
                            </div>
                            <button type="submit" class="px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">Gem</button>
                            <button type="button" @click="moving = false" class="px-3 py-1.5 bg-gray-100 rounded text-xs">Annuller</button>
                        </form>
                    </div>
                </td>
            </tr>
        @empty
            <tr><td colspan="8" class="px-4 py-8 text-center text-gray-400">Ingen sessioner — klik "Regenerér plan".</td></tr>
        @endforelse
        </tbody>
    </table>
</div>
@endsection
