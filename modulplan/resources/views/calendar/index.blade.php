@extends('layouts.app')
@section('title', 'Kalender')

@section('content')
<div x-data="{ view: '{{ $view }}' }"
     x-init="$watch('view', v => { if (v === 'calendar') $nextTick(() => { if(window._fcal) { window._fcal.render(); window._fcal.updateSize(); } }) });
              if (view === 'calendar') $nextTick(() => { if(window._fcal) { window._fcal.render(); window._fcal.updateSize(); } })">

    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 class="text-xl font-bold text-gray-800">Kalender</h1>
        <div class="flex flex-wrap items-center gap-2">
            <div class="flex rounded overflow-hidden border border-gray-300 text-sm">
                <button @click="view = 'list'"
                        :class="view === 'list' ? 'bg-gray-800 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'"
                        class="px-3 py-1.5 transition">Liste</button>
                <button @click="view = 'calendar'; $nextTick(() => { if(window._fcal) { window._fcal.render(); window._fcal.updateSize(); } })"
                        :class="view === 'calendar' ? 'bg-gray-800 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'"
                        class="px-3 py-1.5 transition">Kalender</button>
            </div>

            <form method="GET" action="/" class="flex gap-2 items-center flex-wrap" id="filterForm">
                <input type="hidden" name="view" x-bind:value="view">
                <select name="category" onchange="document.getElementById('filterForm').submit()"
                        class="text-sm border border-gray-300 rounded px-2 py-1.5 bg-white">
                    <option value="">Alle kategorier</option>
                    @foreach($categories as $cat)
                        <option value="{{ $cat->id }}" @selected($categoryId == $cat->id)>{{ $cat->name }}</option>
                    @endforeach
                </select>
                <select name="city" onchange="document.getElementById('filterForm').submit()"
                        class="text-sm border border-gray-300 rounded px-2 py-1.5 bg-white">
                    <option value="">Alle byer</option>
                    @foreach($cities as $city)
                        <option value="{{ $city->id }}" @selected($cityId == $city->id)>{{ $city->name }}</option>
                    @endforeach
                </select>
                <select name="class" onchange="document.getElementById('filterForm').submit()"
                        class="text-sm border border-gray-300 rounded px-2 py-1.5 bg-white">
                    <option value="">Alle hold</option>
                    @foreach($classes as $cls)
                        <option value="{{ $cls->id }}" @selected($classId == $cls->id)>{{ $cls->name }} ({{ $cls->city->name ?? '?' }})</option>
                    @endforeach
                </select>
                <select name="months" onchange="document.getElementById('filterForm').submit()"
                        class="text-sm border border-gray-300 rounded px-2 py-1.5 bg-white">
                    @foreach([1,2,3] as $m)
                        <option value="{{ $m }}" @selected($months == $m)>{{ $m }} mdr.</option>
                    @endforeach
                </select>
            </form>
        </div>
    </div>

    <div x-show="view === 'list'">@include('calendar._list')</div>
    <div x-show="view === 'calendar'" x-cloak>@include('calendar._calendar')</div>

</div>
@endsection