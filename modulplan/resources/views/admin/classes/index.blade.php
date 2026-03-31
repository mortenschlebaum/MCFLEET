@extends('layouts.app')
@section('title', 'Hold')

@section('content')
<div class="flex justify-between items-center mb-6">
    <h1 class="text-2xl font-bold text-gray-800">Hold</h1>
    <a href="{{ route('admin.classes.create') }}" class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium">+ Opret hold</a>
</div>

<div class="bg-white rounded-lg shadow overflow-hidden">
    <table class="w-full text-sm">
        <thead>
            <tr class="bg-gray-50 border-b text-xs uppercase text-gray-500 tracking-wide">
                <th class="px-4 py-3 text-left">Navn</th>
                <th class="px-4 py-3 text-left">Kategorier</th>
                <th class="px-4 py-3 text-left">By</th>
                <th class="px-4 py-3 text-left">Startdato</th>
                <th class="px-4 py-3 text-left">Tid</th>
                <th class="px-4 py-3 text-left">Status</th>
                <th class="px-4 py-3 text-left">Sessioner</th>
                <th class="px-4 py-3"></th>
            </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
        @forelse($classes as $class)
            <tr class="hover:bg-gray-50 transition">
                <td class="px-4 py-3 font-medium text-gray-800">{{ $class->name }}</td>
                <td class="px-4 py-3">
                    @foreach($class->categories as $cat)
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-xs mr-1"
                              style="background: {{ $cat->color }}">
                            {{ $cat->name }}
                        </span>
                    @endforeach
                </td>
                <td class="px-4 py-3 text-gray-600">{{ $class->city->name ?? '—' }}</td>
                <td class="px-4 py-3 text-gray-600">{{ $class->start_date->format('d/m/Y') }}</td>
                <td class="px-4 py-3 text-gray-600">{{ \Illuminate\Support\Str::substr($class->start_time,0,5) }}</td>
                <td class="px-4 py-3">
                    @php $colors=['active'=>'green','completed'=>'blue','cancelled'=>'gray'] @endphp
                    <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-{{ $colors[$class->status]??'gray' }}-100 text-{{ $colors[$class->status]??'gray' }}-700">
                        {{ ucfirst($class->status) }}
                    </span>
                </td>
                <td class="px-4 py-3">
                    <a href="{{ route('admin.classes.sessions.index', $class) }}" class="text-blue-600 hover:underline text-xs">Se sessioner</a>
                </td>
                <td class="px-4 py-3 text-right whitespace-nowrap">
                    <form method="POST" action="{{ route('admin.classes.regenerate', $class) }}" class="inline">
                        @csrf
                        <button type="submit" class="text-xs text-purple-600 hover:text-purple-800 mr-3">↺ Regenerér</button>
                    </form>
                    <a href="{{ route('admin.classes.edit', $class) }}" class="text-xs text-gray-600 hover:text-gray-800 mr-3">Rediger</a>
                    <form method="POST" action="{{ route('admin.classes.destroy', $class) }}" class="inline"
                          onsubmit="return confirm('Slet hold og alle sessioner?')">
                        @csrf @method('DELETE')
                        <button type="submit" class="text-xs text-red-600 hover:text-red-800">Slet</button>
                    </form>
                </td>
            </tr>
        @empty
            <tr><td colspan="8" class="px-4 py-8 text-center text-gray-400">Ingen hold oprettet endnu.</td></tr>
        @endforelse
        </tbody>
    </table>
</div>
@endsection