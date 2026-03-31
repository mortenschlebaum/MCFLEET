@extends('layouts.app')
@section('title', 'Rediger skabelon')

@section('content')
<div class="max-w-2xl">
    <div class="flex items-center gap-3 mb-6">
        <a href="{{ route('admin.templates.index') }}" class="text-gray-500 hover:text-gray-700">← Skabeloner</a>
        <h1 class="text-2xl font-bold text-gray-800">{{ $template->name }}</h1>
        <span class="text-sm text-gray-400">{{ $template->weeks }} uger · {{ $template->frequency }}x/uge</span>
    </div>

    {{-- Entry list --}}
    <div class="bg-white rounded-lg shadow mb-6 divide-y">
        @forelse($entries as $entry)
            <div class="flex items-center gap-3 px-4 py-3">
                <span class="w-6 text-center text-xs text-gray-400 font-mono">{{ $entry->sort_order }}</span>

                @if($entry->type === 'module' && $entry->module)
                    <span class="w-3 h-3 rounded-full flex-shrink-0"
                          style="background: {{ $entry->module->color }}"></span>
                    <span class="flex-1 font-medium text-gray-800">{{ $entry->module->name }}</span>
                    <span class="text-xs text-gray-400 font-mono">{{ $entry->module->code }}</span>
                    <span class="text-xs text-gray-400">{{ $entry->module->default_duration_minutes }} min</span>
                @else
                    <span class="w-3 h-3 rounded-full bg-gray-200 flex-shrink-0"></span>
                    <span class="flex-1 text-gray-500 italic">Pause (spring {{ $entry->skip_slots }} slot{{ $entry->skip_slots != 1 ? 's' : '' }} over)</span>
                @endif

                {{-- Move buttons --}}
                <div class="flex gap-1">
                    <form method="POST" action="{{ route('admin.templates.entries.move-up', [$template, $entry]) }}">
                        @csrf
                        <button type="submit" class="w-7 h-7 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded text-xs" title="Flyt op">▲</button>
                    </form>
                    <form method="POST" action="{{ route('admin.templates.entries.move-down', [$template, $entry]) }}">
                        @csrf
                        <button type="submit" class="w-7 h-7 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded text-xs" title="Flyt ned">▼</button>
                    </form>
                </div>

                {{-- Delete --}}
                <form method="POST" action="{{ route('admin.templates.entries.remove', [$template, $entry]) }}"
                      onsubmit="return confirm('Slet denne række?')">
                    @csrf @method('DELETE')
                    <button type="submit" class="text-xs text-red-500 hover:text-red-700 ml-1">Slet</button>
                </form>
            </div>
        @empty
            <p class="px-4 py-6 text-center text-gray-400 text-sm">Ingen rækker endnu.</p>
        @endforelse
    </div>

    {{-- Add entry form --}}
    <div class="bg-white rounded-lg shadow p-5" x-data="{ type: 'module' }">
        <h2 class="text-sm font-semibold text-gray-600 mb-4">Tilføj række</h2>
        <form method="POST" action="{{ route('admin.templates.entries.add', $template) }}" class="space-y-3">
            @csrf
            <div class="flex gap-4">
                <label class="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="type" value="module" x-model="type" checked class="text-red-600">
                    <span class="text-sm">Modul</span>
                </label>
                <label class="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="type" value="pause" x-model="type" class="text-red-600">
                    <span class="text-sm">Pause</span>
                </label>
            </div>

            <div x-show="type === 'module'">
                <label class="block text-xs text-gray-500 mb-1">Modul</label>
                <select name="module_id" class="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                    <option value="">Vælg modul…</option>
                    @foreach($modules as $mod)
                        <option value="{{ $mod->id }}">
                            {{ $mod->name }} ({{ $mod->code }})
                        </option>
                    @endforeach
                </select>
            </div>

            <div x-show="type === 'pause'" x-cloak>
                <label class="block text-xs text-gray-500 mb-1">Antal slots der springes over</label>
                <input type="number" name="skip_slots" value="1" min="1"
                       class="w-24 border border-gray-300 rounded px-3 py-2 text-sm">
            </div>

            <button type="submit" class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm">
                + Tilføj til sidst
            </button>
        </form>
    </div>
</div>
@endsection