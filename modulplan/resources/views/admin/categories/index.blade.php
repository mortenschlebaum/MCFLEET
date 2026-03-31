@extends('layouts.app')
@section('title', 'Kategorier')

@section('content')
<h1 class="text-2xl font-bold text-gray-800 mb-6">Kategorier</h1>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
    <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-sm font-semibold text-gray-600 mb-4">Tilføj kategori</h2>
        <form method="POST" action="{{ route('admin.categories.store') }}" class="space-y-3">
            @csrf
            <div>
                <label class="block text-xs text-gray-500 mb-1">Navn</label>
                <input type="text" name="name" value="{{ old('name') }}" placeholder="f.eks. Bil"
                       required class="w-full border border-gray-300 rounded px-3 py-2 text-sm">
            </div>
            <div>
                <label class="block text-xs text-gray-500 mb-1">Farve (bruges i kalender)</label>
                <div class="flex items-center gap-3">
                    <input type="color" name="color" value="{{ old('color', '#3b82f6') }}"
                           class="w-12 h-9 border border-gray-300 rounded cursor-pointer p-0.5">
                    <span class="text-xs text-gray-500">Klik for at vælge farve</span>
                </div>
            </div>
            <button type="submit" class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm">
                + Tilføj kategori
            </button>
        </form>
    </div>

    <div>
        <div class="bg-white rounded-lg shadow divide-y">
            @forelse($categories as $cat)
                <div x-data="{ editing: false }" class="px-4 py-3">
                    <div class="flex items-center justify-between" x-show="!editing">
                        <div class="flex items-center gap-3">
                            <span class="w-5 h-5 rounded-full border border-gray-200 flex-shrink-0"
                                  style="background: {{ $cat->color }}"></span>
                            <span class="font-medium text-gray-800">{{ $cat->name }}</span>
                            <span class="text-xs text-gray-400 font-mono">{{ $cat->color }}</span>
                            <span class="text-xs text-gray-400">{{ $cat->classes_count }} hold</span>
                        </div>
                        <div class="flex gap-3">
                            <button @click="editing = true" class="text-xs text-blue-600 hover:text-blue-800">Rediger</button>
                            <form method="POST" action="{{ route('admin.categories.destroy', $cat) }}" class="inline"
                                  onsubmit="return confirm('Slet kategori?')">
                                @csrf @method('DELETE')
                                <button type="submit" class="text-xs text-red-500 hover:text-red-700">Slet</button>
                            </form>
                        </div>
                    </div>
                    <form method="POST" action="{{ route('admin.categories.update', $cat) }}"
                          x-show="editing" x-cloak class="flex gap-2 items-end flex-wrap">
                        @csrf @method('PUT')
                        <input type="text" name="name" value="{{ $cat->name }}"
                               class="border border-gray-300 rounded px-2 py-1 text-sm flex-1 min-w-0">
                        <input type="color" name="color" value="{{ $cat->color }}"
                               class="w-12 h-9 border border-gray-300 rounded cursor-pointer p-0.5">
                        <button type="submit" class="px-3 py-1.5 bg-blue-600 text-white rounded text-xs">Gem</button>
                        <button type="button" @click="editing = false" class="px-3 py-1.5 bg-gray-100 rounded text-xs">Annuller</button>
                    </form>
                </div>
            @empty
                <p class="px-4 py-6 text-center text-gray-400 text-sm">Ingen kategorier.</p>
            @endforelse
        </div>
    </div>
</div>
@endsection