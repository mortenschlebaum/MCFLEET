@extends('layouts.app')
@section('title', 'Byer')

@section('content')
<h1 class="text-2xl font-bold text-gray-800 mb-6">Byer</h1>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
    {{-- Add form --}}
    <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-sm font-semibold text-gray-600 mb-4">Tilføj by</h2>
        <form method="POST" action="{{ route('admin.cities.store') }}" class="space-y-3">
            @csrf
            <div>
                <label class="block text-xs text-gray-500 mb-1">Navn</label>
                <input type="text" name="name" value="{{ old('name') }}" placeholder="f.eks. Kolding"
                       required class="w-full border border-gray-300 rounded px-3 py-2 text-sm">
            </div>
            <div>
                <label class="block text-xs text-gray-500 mb-1">Kode</label>
                <input type="text" name="code" value="{{ old('code') }}" placeholder="f.eks. KLD"
                       required class="w-full border border-gray-300 rounded px-3 py-2 text-sm">
            </div>
            <button type="submit" class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm">
                + Tilføj by
            </button>
        </form>
    </div>

    {{-- List --}}
    <div>
        <div class="bg-white rounded-lg shadow divide-y">
            @forelse($cities as $city)
                <div x-data="{ editing: false }" class="px-4 py-3">
                    <div class="flex items-center justify-between" x-show="!editing">
                        <div>
                            <span class="font-medium text-gray-800">{{ $city->name }}</span>
                            <span class="ml-2 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-mono">{{ $city->code }}</span>
                            <span class="ml-2 text-xs text-gray-400">{{ $city->classes_count }} hold</span>
                        </div>
                        <div class="flex gap-3">
                            <button @click="editing = true" class="text-xs text-blue-600 hover:text-blue-800">Rediger</button>
                            <form method="POST" action="{{ route('admin.cities.destroy', $city) }}" class="inline"
                                  onsubmit="return confirm('Slet by?')">
                                @csrf @method('DELETE')
                                <button type="submit" class="text-xs text-red-500 hover:text-red-700">Slet</button>
                            </form>
                        </div>
                    </div>
                    <form method="POST" action="{{ route('admin.cities.update', $city) }}"
                          x-show="editing" x-cloak class="flex gap-2 items-end">
                        @csrf @method('PUT')
                        <input type="text" name="name" value="{{ $city->name }}"
                               class="border border-gray-300 rounded px-2 py-1 text-sm flex-1">
                        <input type="text" name="code" value="{{ $city->code }}"
                               class="border border-gray-300 rounded px-2 py-1 text-sm w-24 font-mono">
                        <button type="submit" class="px-3 py-1.5 bg-blue-600 text-white rounded text-xs">Gem</button>
                        <button type="button" @click="editing = false" class="px-3 py-1.5 bg-gray-100 rounded text-xs">Annuller</button>
                    </form>
                </div>
            @empty
                <p class="px-4 py-6 text-center text-gray-400 text-sm">Ingen byer oprettet endnu.</p>
            @endforelse
        </div>
    </div>
</div>
@endsection
