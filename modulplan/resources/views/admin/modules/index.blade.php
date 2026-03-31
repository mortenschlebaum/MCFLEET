@extends('layouts.app')
@section('title', 'Moduler')

@section('content')
<h1 class="text-2xl font-bold text-gray-800 mb-6">Moduler</h1>

@if(session('success'))
    <div class="mb-4 bg-green-50 border border-green-300 text-green-700 px-4 py-3 rounded text-sm">{{ session('success') }}</div>
@endif
@if(session('error'))
    <div class="mb-4 bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded text-sm">{{ session('error') }}</div>
@endif

<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
    <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-sm font-semibold text-gray-600 mb-4">Tilføj modul</h2>
        <form method="POST" action="{{ route('admin.modules.store') }}" class="space-y-3">
            @csrf
            <div>
                <label class="block text-xs text-gray-500 mb-1">Navn</label>
                <input type="text" name="name" value="{{ old('name') }}" placeholder="f.eks. Modul 1"
                       required class="w-full border border-gray-300 rounded px-3 py-2 text-sm">
            </div>
            <div>
                <label class="block text-xs text-gray-500 mb-1">Kode</label>
                <input type="text" name="code" value="{{ old('code') }}" placeholder="f.eks. MOD1"
                       required class="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono">
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
            <div>
                <label class="block text-xs text-gray-500 mb-1">Standardvarighed (minutter)</label>
                <input type="number" name="default_duration_minutes" value="{{ old('default_duration_minutes', 45) }}"
                       min="0" required class="w-full border border-gray-300 rounded px-3 py-2 text-sm">
            </div>
            <div>
                <label class="block text-xs text-gray-500 mb-1">Farve</label>
                <div class="flex items-center gap-3">
                    <input type="color" name="color" value="{{ old('color', '#6b7280') }}"
                           class="w-12 h-9 border border-gray-300 rounded cursor-pointer p-0.5">
                    <span class="text-xs text-gray-500">Klik for at vælge farve</span>
                </div>
            </div>
            <button type="submit" class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm">
                + Tilføj modul
            </button>
        </form>
    </div>

    <div>
        <div class="bg-white rounded-lg shadow divide-y">
            @forelse($modules as $module)
                <div x-data="{ editing: false }" class="px-4 py-3">
                    <div class="flex items-center justify-between" x-show="!editing">
                        <div class="flex items-center gap-3 flex-wrap">
                            <span class="w-4 h-4 rounded-full border border-gray-200 flex-shrink-0"
                                  style="background: {{ $module->color }}"></span>
                            <span class="font-medium text-gray-800">{{ $module->name }}</span>
                            <span class="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-mono">{{ $module->code }}</span>
                            <span class="text-xs text-gray-400">{{ $module->default_duration_minutes }} min</span>
                            @if($module->category)
                                <span class="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border"
                                      style="border-color: {{ $module->category->color }}; color: {{ $module->category->color }}">
                                    <span class="w-2 h-2 rounded-full inline-block" style="background: {{ $module->category->color }}"></span>
                                    {{ $module->category->name }}
                                </span>
                            @else
                                <span class="text-xs text-gray-300 italic">Ingen kategori</span>
                            @endif
                        </div>
                        <div class="flex gap-3 flex-shrink-0">
                            <button @click="editing = true" class="text-xs text-blue-600 hover:text-blue-800">Rediger</button>
                            <form method="POST" action="{{ route('admin.modules.destroy', $module) }}" class="inline"
                                  onsubmit="return confirm('Slet modul?')">
                                @csrf @method('DELETE')
                                <button type="submit" class="text-xs text-red-500 hover:text-red-700">Slet</button>
                            </form>
                        </div>
                    </div>
                    <form method="POST" action="{{ route('admin.modules.update', $module) }}"
                          x-show="editing" x-cloak class="grid grid-cols-2 gap-2 items-end mt-1">
                        @csrf @method('PUT')
                        <div>
                            <label class="block text-xs text-gray-400 mb-0.5">Navn</label>
                            <input type="text" name="name" value="{{ $module->name }}"
                                   class="w-full border border-gray-300 rounded px-2 py-1 text-sm">
                        </div>
                        <div>
                            <label class="block text-xs text-gray-400 mb-0.5">Kode</label>
                            <input type="text" name="code" value="{{ $module->code }}"
                                   class="w-full border border-gray-300 rounded px-2 py-1 text-sm font-mono">
                        </div>
                        <div class="col-span-2">
                            <label class="block text-xs text-gray-400 mb-0.5">Kategori</label>
                            <select name="category_id" class="w-full border border-gray-300 rounded px-2 py-1 text-sm">
                                <option value="">— Ingen kategori —</option>
                                @foreach($categories as $cat)
                                    <option value="{{ $cat->id }}" @selected($module->category_id == $cat->id)>
                                        {{ $cat->name }}
                                    </option>
                                @endforeach
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs text-gray-400 mb-0.5">Varighed (min)</label>
                            <input type="number" name="default_duration_minutes" value="{{ $module->default_duration_minutes }}"
                                   class="w-full border border-gray-300 rounded px-2 py-1 text-sm">
                        </div>
                        <div>
                            <label class="block text-xs text-gray-400 mb-0.5">Farve</label>
                            <input type="color" name="color" value="{{ $module->color }}"
                                   class="w-12 h-9 border border-gray-300 rounded cursor-pointer p-0.5">
                        </div>
                        <div class="col-span-2 flex gap-2 mt-1">
                            <button type="submit" class="px-3 py-1.5 bg-blue-600 text-white rounded text-xs">Gem</button>
                            <button type="button" @click="editing = false" class="px-3 py-1.5 bg-gray-100 rounded text-xs">Annuller</button>
                        </div>
                    </form>
                </div>
            @empty
                <p class="px-4 py-6 text-center text-gray-400 text-sm">Ingen moduler.</p>
            @endforelse
        </div>
    </div>
</div>
@endsection
