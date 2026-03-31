@extends('layouts.app')
@section('title', 'Helligdage & Ferier')

@section('content')
<h1 class="text-2xl font-bold text-gray-800 mb-6">Helligdage & Ferier</h1>

{{-- Import Danish holidays --}}
<div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8 flex flex-wrap items-center gap-4">
    <div>
        <p class="text-sm font-semibold text-blue-800">Importer danske helligdage automatisk</p>
        <p class="text-xs text-blue-600 mt-0.5">Nytårsdag, påske, Kristi himmelfartsdag, pinse, Grundlovsdag, jul m.fl.</p>
    </div>
    <form method="POST" action="{{ route('admin.blocked-dates.import-year') }}" class="flex items-center gap-2 ml-auto">
        @csrf
        <label class="text-sm text-blue-700 font-medium">År:</label>
        <input type="number" name="year" value="{{ now()->year }}" min="1990" max="2100"
               class="border border-blue-300 rounded px-3 py-1.5 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-blue-400">
        <button type="submit" class="px-4 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium">
            Importer
        </button>
    </form>
</div>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">

    {{-- === HELLIGDAGE === --}}
    <div>
        <h2 class="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span class="w-3 h-3 rounded bg-yellow-400 inline-block"></span> Helligdage
        </h2>

        <div class="bg-white rounded-lg shadow p-5 mb-4">
            <h3 class="text-sm font-medium text-gray-600 mb-3">Tilføj helligdag manuelt</h3>
            <form method="POST" action="{{ route('admin.blocked-dates.store') }}" class="space-y-3">
                @csrf
                <input type="hidden" name="type" value="holiday">
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs text-gray-500 mb-1">Navn</label>
                        <input type="text" name="name" placeholder="f.eks. Juledag" required
                               class="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                    </div>
                    <div>
                        <label class="block text-xs text-gray-500 mb-1">Dato</label>
                        <input type="date" name="date" required
                               class="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                    </div>
                </div>
                <div>
                    <label class="block text-xs text-gray-500 mb-1">By (tom = alle byer)</label>
                    <select name="city_id" class="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                        <option value="">Alle byer</option>
                        @foreach($cities as $city)
                            <option value="{{ $city->id }}">{{ $city->name }}</option>
                        @endforeach
                    </select>
                </div>
                <button type="submit" class="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm">
                    + Tilføj helligdag
                </button>
            </form>
        </div>

        @forelse($holidays as $year => $items)
            <div class="mb-4">
                <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{{ $year }}</h4>
                <div class="bg-white rounded-lg shadow divide-y">
                    @foreach($items as $item)
                        <div class="flex items-center justify-between px-4 py-2.5 hover:bg-yellow-50">
                            <div>
                                <span class="font-medium text-sm text-gray-800">{{ $item->name }}</span>
                                <span class="ml-2 text-xs text-gray-500">{{ $item->date->format('d/m/Y') }}</span>
                                @if($item->city)
                                    <span class="ml-2 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{{ $item->city->name }}</span>
                                @else
                                    <span class="ml-2 text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">Alle byer</span>
                                @endif
                            </div>
                            <form method="POST" action="{{ route('admin.blocked-dates.destroy', $item) }}">
                                @csrf @method('DELETE')
                                <button type="submit" class="text-xs text-red-500 hover:text-red-700"
                                        onclick="return confirm('Slet \'{{ $item->name }}\'?')">Slet</button>
                            </form>
                        </div>
                    @endforeach
                </div>
            </div>
        @empty
            <p class="text-sm text-gray-400">Ingen helligdage registreret. Brug "Importer" knappen øverst.</p>
        @endforelse
    </div>

    {{-- === FERIER === --}}
    <div>
        <h2 class="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span class="w-3 h-3 rounded bg-green-400 inline-block"></span> Ferier
        </h2>

        <div class="bg-white rounded-lg shadow p-5 mb-4">
            <h3 class="text-sm font-medium text-gray-600 mb-3">Tilføj ferie</h3>
            <form method="POST" action="{{ route('admin.blocked-dates.store') }}" class="space-y-3">
                @csrf
                <input type="hidden" name="type" value="vacation">
                <div>
                    <label class="block text-xs text-gray-500 mb-1">Navn</label>
                    <input type="text" name="name" placeholder="f.eks. Vinterferie 2026" required
                           class="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs text-gray-500 mb-1">Fra dato</label>
                        <input type="date" name="date" required
                               class="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                    </div>
                    <div>
                        <label class="block text-xs text-gray-500 mb-1">Til dato <span class="text-gray-400">(valgfri – enkelt dag hvis tom)</span></label>
                        <input type="date" name="date_to"
                               class="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs text-gray-500 mb-1">Kategori</label>
                        <select name="category" required class="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                            <option value="">Vælg…</option>
                            @foreach(['Vinterferie','Påskeferie','Sommerferie','Efterårsferie','Juleferie'] as $cat)
                                <option value="{{ $cat }}">{{ $cat }}</option>
                            @endforeach
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs text-gray-500 mb-1">By (tom = alle)</label>
                        <select name="city_id" class="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                            <option value="">Alle byer</option>
                            @foreach($cities as $city)
                                <option value="{{ $city->id }}">{{ $city->name }}</option>
                            @endforeach
                        </select>
                    </div>
                </div>
                <button type="submit" class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm">
                    + Tilføj ferie
                </button>
            </form>
        </div>

        @forelse($vacations as $year => $items)
            @php
                // Group consecutive days with same name+category+city into ranges
                $groups = [];
                foreach ($items as $item) {
                    $key = $item->name . '|' . ($item->category ?? '') . '|' . ($item->city_id ?? '');
                    $last = end($groups);
                    if ($last && $last['key'] === $key
                        && $last['last_date']->copy()->addDay()->toDateString() === $item->date->toDateString()) {
                        $groups[count($groups) - 1]['ids'][]     = $item->id;
                        $groups[count($groups) - 1]['last_date'] = $item->date;
                    } else {
                        $groups[] = [
                            'key'        => $key,
                            'name'       => $item->name,
                            'category'   => $item->category,
                            'city'       => $item->city,
                            'first_date' => $item->date,
                            'last_date'  => $item->date,
                            'ids'        => [$item->id],
                        ];
                    }
                }
            @endphp
            <div class="mb-4">
                <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{{ $year }}</h4>
                <div class="bg-white rounded-lg shadow divide-y">
                    @foreach($groups as $group)
                        <div class="flex items-center justify-between px-4 py-2.5 hover:bg-green-50">
                            <div>
                                <span class="font-medium text-sm text-gray-800">{{ $group['name'] }}</span>
                                @if($group['first_date']->toDateString() === $group['last_date']->toDateString())
                                    <span class="ml-2 text-xs text-gray-500">{{ $group['first_date']->format('d/m/Y') }}</span>
                                @else
                                    <span class="ml-2 text-xs text-gray-500">
                                        {{ $group['first_date']->format('d/m/Y') }} – {{ $group['last_date']->format('d/m/Y') }}
                                        <span class="text-gray-400">({{ count($group['ids']) }} dage)</span>
                                    </span>
                                @endif
                                @if($group['category'])
                                    <span class="ml-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">{{ $group['category'] }}</span>
                                @endif
                                @if($group['city'])
                                    <span class="ml-2 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{{ $group['city']->name }}</span>
                                @endif
                            </div>
                            {{-- Delete all days in this group at once --}}
                            <form method="POST" action="{{ route('admin.blocked-dates.destroy-range') }}"
                                  onsubmit="return confirm('Slet \'{{ $group['name'] }}\' ({{ count($group['ids']) }} dag(e))?')">
                                @csrf @method('DELETE')
                                @foreach($group['ids'] as $gid)
                                    <input type="hidden" name="ids[]" value="{{ $gid }}">
                                @endforeach
                                <button type="submit" class="text-xs text-red-500 hover:text-red-700">Slet</button>
                            </form>
                        </div>
                    @endforeach
                </div>
            </div>
        @empty
            <p class="text-sm text-gray-400">Ingen ferier registreret.</p>
        @endforelse
    </div>

</div>
@endsection