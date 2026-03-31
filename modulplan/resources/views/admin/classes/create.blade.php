@extends('layouts.app')
@section('title', 'Opret hold')

@section('content')
<div class="max-w-2xl">
    <div class="flex items-center gap-3 mb-6">
        <a href="{{ route('admin.classes.index') }}" class="text-gray-500 hover:text-gray-700">← Hold</a>
        <h1 class="text-2xl font-bold text-gray-800">Opret hold</h1>
    </div>

    <div x-data="classForm()" class="bg-white rounded-lg shadow p-6 space-y-5">
        <form method="POST" action="{{ route('admin.classes.store') }}" @submit="submitting = true">
            @csrf

            @if($errors->any())
                <div class="bg-red-50 border border-red-300 text-red-700 p-3 rounded text-sm">
                    <ul class="list-disc list-inside space-y-1">
                        @foreach($errors->all() as $e)<li>{{ $e }}</li>@endforeach
                    </ul>
                </div>
            @endif

            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">By</label>
                <select name="city_id" required class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
                    <option value="">Vælg by…</option>
                    @foreach($cities as $city)
                        <option value="{{ $city->id }}" @selected(old('city_id')==$city->id)>{{ $city->name }}</option>
                    @endforeach
                </select>
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Skabelon</label>
                <select name="course_template_id" x-model="templateId" @change="fetchPreview()" required
                        class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
                    <option value="">Vælg skabelon…</option>
                    @foreach($templatesByCategory as $catName => $group)
                        <optgroup label="{{ $catName }}">
                            @foreach($group as $tpl)
                                <option value="{{ $tpl->id }}" @selected(old('course_template_id')==$tpl->id)>
                                    {{ $tpl->name }} ({{ $tpl->weeks }} uger, {{ $tpl->frequency }}x/uge)
                                </option>
                            @endforeach
                        </optgroup>
                    @endforeach
                </select>
            </div>

            {{-- Categories --}}
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Kategori(er)</label>
                <div class="flex flex-wrap gap-3">
                    @foreach($categories as $cat)
                        <label class="flex items-center gap-1.5 cursor-pointer select-none">
                            <input type="checkbox" name="category_ids[]" value="{{ $cat->id }}"
                                   @checked(in_array($cat->id, old('category_ids', [])))
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
                    <input type="date" name="start_date" x-model="startDate" @change="fetchPreview()"
                           value="{{ old('start_date', $prefillDate ?? '') }}"
                           required class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Starttid</label>
                    <input type="time" name="start_time" value="{{ old('start_time', '08:00') }}"
                           required class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
                </div>
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Undervisningsdage</label>
                <div class="flex gap-3 flex-wrap">
                    @php $dayNames = [1=>'Man',2=>'Tir',3=>'Ons',4=>'Tor',5=>'Fre',6=>'Lør',7=>'Søn'] @endphp
                    @foreach($dayNames as $num => $name)
                        <label class="flex items-center gap-1.5 cursor-pointer select-none">
                            <input type="checkbox" name="teaching_days[]" value="{{ $num }}"
                                   x-model="teachingDays" @change="fetchPreview()"
                                   @checked(in_array($num, old('teaching_days', [])))
                                   class="rounded border-gray-300 text-red-600">
                            <span class="text-sm text-gray-700">{{ $name }}</span>
                        </label>
                    @endforeach
                </div>
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Helligdagsstrategi</label>
                <select name="holiday_strategy" required class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
                    <option value="next_valid" @selected(old('holiday_strategy','next_valid')==='next_valid')>Flyt til næste gyldige dag</option>
                    <option value="flag" @selected(old('holiday_strategy')==='flag')>Markér som konflikt</option>
                    <option value="manual" @selected(old('holiday_strategy')==='manual')>Manuel håndtering</option>
                    <option value="shift_all" @selected(old('holiday_strategy')==='shift_all')>Forskyd hele holdet</option>
                </select>
            </div>

            <div class="border-t pt-5">
                <label class="flex items-center gap-2 cursor-pointer mb-3">
                    <input type="checkbox" x-model="seriesMode" class="rounded border-gray-300 text-red-600">
                    <span class="text-sm font-medium text-gray-700">Serie-oprettelse (opret flere hold i træk)</span>
                </label>
                <div x-show="seriesMode" x-cloak class="space-y-3">
                    <div>
                        <label class="block text-sm text-gray-600 mb-1">Slutdato for serien</label>
                        <input type="date" name="series_end_date" x-model="seriesEnd" @change="fetchPreview()"
                               class="border border-gray-300 rounded px-3 py-2 text-sm">
                    </div>
                    <div x-show="preview" x-cloak class="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
                        <strong x-text="'Antal hold: ' + preview.count"></strong>
                        <ul class="mt-1 text-xs list-disc list-inside text-blue-700 space-y-0.5">
                            <template x-for="d in preview.dates" :key="d"><li x-text="d"></li></template>
                        </ul>
                    </div>
                </div>
            </div>

            <div class="flex gap-3 pt-2">
                <button type="submit" :disabled="submitting"
                        class="px-5 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium disabled:opacity-50">
                    Opret hold
                </button>
                <a href="{{ route('admin.classes.index') }}" class="px-5 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm">Annuller</a>
            </div>
        </form>
    </div>
</div>

@push('scripts')
<script>
function classForm() {
    return {
        templateId: '{{ old('course_template_id', '') }}',
        startDate:  '{{ old('start_date', $prefillDate ?? '') }}',
        teachingDays: {{ json_encode(array_map('intval', old('teaching_days', []))) }},
        seriesMode: false,
        seriesEnd:  '',
        preview:    null,
        submitting: false,
        fetchPreview() {
            if (!this.seriesMode || !this.seriesEnd || !this.startDate || !this.templateId || this.teachingDays.length === 0) {
                this.preview = null; return;
            }
            const params = new URLSearchParams({ start_date: this.startDate, course_template_id: this.templateId, series_end_date: this.seriesEnd });
            this.teachingDays.forEach(d => params.append('teaching_days[]', d));
            fetch('/admin/classes/preview-series?' + params.toString()).then(r => r.json()).then(data => this.preview = data);
        }
    }
}
</script>
@endpush
@endsection