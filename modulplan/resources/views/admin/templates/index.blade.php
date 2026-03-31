@extends('layouts.app')
@section('title', 'Skabeloner')

@section('content')
<h1 class="text-2xl font-bold text-gray-800 mb-6">Skabeloner</h1>

@if(session('success'))
    <div class="mb-4 bg-green-50 border border-green-300 text-green-700 px-4 py-3 rounded text-sm">{{ session('success') }}</div>
@endif
@if(session('error'))
    <div class="mb-4 bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded text-sm">{{ session('error') }}</div>
@endif

<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">

    {{-- Create form --}}
    <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-sm font-semibold text-gray-600 mb-4">Opret skabelon</h2>
        <form method="POST" action="{{ route('admin.templates.store') }}" class="space-y-3">
            @csrf
            <div>
                <label class="block text-xs text-gray-500 mb-1">Navn</label>
                <input type="text" name="name" value="{{ old('name') }}" placeholder="f.eks. 4 ugers Bil"
                       required class="w-full border border-gray-300 rounded px-3 py-2 text-sm">
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs text-gray-500 mb-1">Antal uger</label>
                    <input type="number" name="weeks" value="{{ old('weeks', 4) }}" min="1"
                           required class="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                </div>
                <div>
                    <label class="block text-xs text-gray-500 mb-1">Lektioner/uge</label>
                    <input type="number" name="frequency" value="{{ old('frequency', 1) }}" min="1" max="7"
                           required class="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                </div>
            </div>
            <div>
                <label class="block text-xs text-gray-500 mb-1">Kategori</label>
                <select name="category_id" class="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                    <option value="">— Ingen kategori —</option>
                    @foreach($categories as $cat)
                        <option value="{{ $cat->id }}" @selected(old('category_id') == $cat->id)>
                            {{ $cat->name }}
                        </option>
                    @endforeach
                </select>
            </div>
            <button type="submit" class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm">
                + Opret skabelon
            </button>
        </form>
    </div>

    {{-- Template list --}}
    <div>
        @forelse($templatesByCategory as $catName => $group)
            <div class="mb-4">
                <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">{{ $catName }}</h3>
                <div class="bg-white rounded-lg shadow divide-y">
                    @foreach($group as $tpl)
                        <div x-data="{ editing: false }" class="px-4 py-3">
                            {{-- View mode --}}
                            <div class="flex items-center justify-between gap-3" x-show="!editing">
                                <div class="flex items-center gap-3 flex-wrap">
                                    @if($tpl->category)
                                        <span class="w-3 h-3 rounded-full flex-shrink-0"
                                              style="background: {{ $tpl->category->color }}"></span>
                                    @else
                                        <span class="w-3 h-3 rounded-full bg-gray-200 flex-shrink-0"></span>
                                    @endif
                                    <span class="font-semibold text-gray-800">{{ $tpl->name }}</span>
                                    <span class="text-xs text-gray-400">{{ $tpl->weeks }} uger · {{ $tpl->frequency }}x/uge · {{ $tpl->entries_count }} rækker</span>
                                </div>
                                <div class="flex gap-2 flex-shrink-0">
                                    <a href="{{ route('admin.templates.entries', $tpl) }}"
                                       class="px-3 py-1.5 bg-gray-800 text-white rounded text-xs hover:bg-gray-700">
                                        Rækker →
                                    </a>
                                    <button @click="editing = true"
                                            class="px-3 py-1.5 bg-blue-50 text-blue-600 rounded text-xs hover:bg-blue-100">
                                        Rediger
                                    </button>
                                    <form method="POST" action="{{ route('admin.templates.destroy', $tpl) }}"
                                          onsubmit="return confirm('Slet skabelon?')">
                                        @csrf @method('DELETE')
                                        <button type="submit" class="px-3 py-1.5 bg-red-50 text-red-500 rounded text-xs hover:bg-red-100">Slet</button>
                                    </form>
                                </div>
                            </div>

                            {{-- Edit mode --}}
                            <form method="POST" action="{{ route('admin.templates.update', $tpl) }}"
                                  x-show="editing" x-cloak class="space-y-2 mt-1">
                                @csrf @method('PUT')
                                <div class="grid grid-cols-2 gap-2">
                                    <div class="col-span-2">
                                        <label class="block text-xs text-gray-400 mb-0.5">Navn</label>
                                        <input type="text" name="name" value="{{ $tpl->name }}"
                                               class="w-full border border-gray-300 rounded px-2 py-1 text-sm">
                                    </div>
                                    <div>
                                        <label class="block text-xs text-gray-400 mb-0.5">Uger</label>
                                        <input type="number" name="weeks" value="{{ $tpl->weeks }}" min="1"
                                               class="w-full border border-gray-300 rounded px-2 py-1 text-sm">
                                    </div>
                                    <div>
                                        <label class="block text-xs text-gray-400 mb-0.5">Lektioner/uge</label>
                                        <input type="number" name="frequency" value="{{ $tpl->frequency }}" min="1" max="7"
                                               class="w-full border border-gray-300 rounded px-2 py-1 text-sm">
                                    </div>
                                    <div class="col-span-2">
                                        <label class="block text-xs text-gray-400 mb-0.5">Kategori</label>
                                        <select name="category_id" class="w-full border border-gray-300 rounded px-2 py-1 text-sm">
                                            <option value="">— Ingen kategori —</option>
                                            @foreach($categories as $cat)
                                                <option value="{{ $cat->id }}" @selected($tpl->category_id == $cat->id)>
                                                    {{ $cat->name }}
                                                </option>
                                            @endforeach
                                        </select>
                                    </div>
                                </div>
                                <div class="flex gap-2">
                                    <button type="submit" class="px-3 py-1.5 bg-blue-600 text-white rounded text-xs">Gem</button>
                                    <button type="button" @click="editing = false" class="px-3 py-1.5 bg-gray-100 rounded text-xs">Annuller</button>
                                </div>
                            </form>
                        </div>
                    @endforeach
                </div>
            </div>
        @empty
            <div class="bg-white rounded-lg shadow px-5 py-8 text-center text-gray-400">Ingen skabeloner.</div>
        @endforelse
    </div>

</div>
@endsection
