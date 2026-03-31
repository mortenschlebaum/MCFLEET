@extends('layouts.app')
@section('title', 'Rediger hold')

@section('content')
<div class="max-w-2xl">
    <div class="flex items-center gap-3 mb-6">
        <a href="{{ route('admin.classes.index') }}" class="text-gray-500 hover:text-gray-700">← Hold</a>
        <h1 class="text-2xl font-bold text-gray-800">Rediger: {{ $class->name }}</h1>
    </div>

    <div class="bg-white rounded-lg shadow p-6 space-y-5">
        <form method="POST" action="{{ route('admin.classes.update', $class) }}">
            @csrf @method('PUT')

            @if($errors->any())
                <div class="bg-red-50 border border-red-300 text-red-700 p-3 rounded text-sm">
                    <ul class="list-disc list-inside">@foreach($errors->all() as $e)<li>{{ $e }}</li>@endforeach</ul>
                </div>
            @endif

            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">By</label>
                <select name="city_id" required class="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                    @foreach($cities as $city)
                        <option value="{{ $city->id }}" @selected(old('city_id',$class->city_id)==$city->id)>{{ $city->name }}</option>
                    @endforeach
                </select>
            </div>

            {{-- Categories --}}
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Kategori(er)</label>
                @php $currentCats = old('category_ids', $class->categories->pluck('id')->toArray()) @endphp
                <div class="flex flex-wrap gap-3">
                    @foreach($categories as $cat)
                        <label class="flex items-center gap-1.5 cursor-pointer select-none">
                            <input type="checkbox" name="category_ids[]" value="{{ $cat->id }}"
                                   @checked(in_array($cat->id, $currentCats))
                                   class="rounded border-gray-300 text-red-600">
                            <span class="w-3 h-3 rounded-full inline-block" style="background:{{ $cat->color }}"></span>
                            <span class="text-sm text-gray-700">{{ $cat->name }}</span>
                        </label>
                    @endforeach
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Startdato</label>
                    <input type="date" name="start_date" value="{{ old('start_date', $class->start_date->toDateString()) }}"
                           required class="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Starttid</label>
                    <input type="time" name="start_time" value="{{ old('start_time', \Illuminate\Support\Str::substr($class->start_time,0,5)) }}"
                           required class="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                </div>
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Undervisningsdage</label>
                @php $currentDays = old('teaching_days', $class->teachingDays->pluck('day_of_week')->toArray());
                     $dayNames = [1=>'Man',2=>'Tir',3=>'Ons',4=>'Tor',5=>'Fre',6=>'Lør',7=>'Søn']; @endphp
                <div class="flex gap-3 flex-wrap">
                    @foreach($dayNames as $num => $name)
                        <label class="flex items-center gap-1.5 cursor-pointer">
                            <input type="checkbox" name="teaching_days[]" value="{{ $num }}"
                                   @checked(in_array($num,$currentDays)) class="rounded border-gray-300 text-red-600">
                            <span class="text-sm text-gray-700">{{ $name }}</span>
                        </label>
                    @endforeach
                </div>
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Helligdagsstrategi</label>
                <select name="holiday_strategy" required class="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                    @foreach(['next_valid'=>'Flyt til næste gyldige dag','flag'=>'Markér som konflikt','manual'=>'Manuel håndtering','shift_all'=>'Forskyd hele holdet'] as $val=>$label)
                        <option value="{{ $val }}" @selected(old('holiday_strategy',$class->holiday_strategy)===$val)>{{ $label }}</option>
                    @endforeach
                </select>
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select name="status" required class="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                    @foreach(['active'=>'Aktiv','completed'=>'Afsluttet','cancelled'=>'Aflyst'] as $val=>$label)
                        <option value="{{ $val }}" @selected(old('status',$class->status)===$val)>{{ $label }}</option>
                    @endforeach
                </select>
            </div>

            <p class="text-xs text-gray-500 bg-yellow-50 border border-yellow-200 rounded p-2">
                ⚠ Gemning regenererer automatisk hele sessionsplanen.
            </p>

            <div class="flex gap-3 pt-2">
                <button type="submit" class="px-5 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium">Gem ændringer</button>
                <a href="{{ route('admin.classes.index') }}" class="px-5 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm">Annuller</a>
            </div>
        </form>
    </div>
</div>
@endsection