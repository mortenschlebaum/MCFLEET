{{-- Session detail modal (used in list view rows) --}}
<div x-show="showDetail" x-cloak
     @click.stop
     style="display:none"
     class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div class="flex justify-between items-start mb-4">
            <h3 class="text-lg font-bold text-gray-800">Session detaljer</h3>
            <button @click="showDetail = false" class="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-5">
            <dt class="text-gray-500">Modul</dt>
            <dd class="font-medium">{{ $session->templateEntry->module->name ?? '—' }}</dd>
            <dt class="text-gray-500">Hold</dt>
            <dd>{{ $session->courseClass->name }}</dd>
            <dt class="text-gray-500">By</dt>
            <dd>{{ $session->courseClass->city->name ?? '—' }}</dd>
            <dt class="text-gray-500">Dato</dt>
            <dd>{{ ($session->actual_date ?? $session->scheduled_date)->format('d/m/Y') }}</dd>
            <dt class="text-gray-500">Tid</dt>
            <dd>{{ \Illuminate\Support\Str::substr($session->start_time,0,5) }} – {{ \Illuminate\Support\Str::substr($session->end_time,0,5) }}</dd>
            <dt class="text-gray-500">Varighed</dt>
            <dd>{{ $session->duration_minutes }} min</dd>
            <dt class="text-gray-500">Status</dt>
            <dd>
                @if($session->conflict)<span class="text-orange-500 font-semibold">⚠ Konflikt</span>
                @else{{ ucfirst($session->status) }}@endif
            </dd>
            @if($session->move_reason)
                <dt class="text-gray-500">Årsag</dt>
                <dd class="col-span-1">{{ $session->move_reason }}</dd>
            @endif
        </dl>
        <div class="flex gap-2 justify-end">
            <a href="/admin/classes/{{ $session->class_id }}/sessions"
               class="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                Administrer sessioner
            </a>
            <form method="POST" action="/admin/classes/{{ $session->class_id }}"
                  onsubmit="return confirm('Slet hele holdet og alle sessioner?')">
                @csrf @method('DELETE')
                <button type="submit" class="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700">
                    Slet hold
                </button>
            </form>
            <button @click="showDetail = false"
                    class="px-4 py-2 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200">
                Luk
            </button>
        </div>
    </div>
</div>
