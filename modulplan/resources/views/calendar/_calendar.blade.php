{{-- FullCalendar partial --}}
<style>
    .fc-weekend-cell { background-color: #e5e7eb !important; }
</style>
<div id="fc-calendar" class="bg-white rounded-lg shadow p-4"></div>

@push('scripts')
<script>
document.addEventListener('DOMContentLoaded', function () {
    var calEl = document.getElementById('fc-calendar');
    if (!calEl) return;

    var events = @json($calendarEvents);

    window._fcal = new FullCalendar.Calendar(calEl, {
        initialView: 'dayGridMonth',
        locale: 'da',
        firstDay: 1,
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek'
        },
        events: events,
        dayCellClassNames: function(arg) {
            var day = arg.date.getDay();
            if (day === 0 || day === 6) return ['fc-weekend-cell'];
            return [];
        },
        eventClick: function(info) {
            var p = info.event.extendedProps;
            if (p.sessionId) {
                window.location.href = '/admin/classes/' + p.classId + '/sessions';
            }
        },
        eventDidMount: function(info) {
            if (info.event.extendedProps.conflict) {
                info.el.style.border = '2px solid orange';
                info.el.title = '⚠ Konflikt';
            }
        }
    });

    if (calEl.offsetParent !== null) {
        window._fcal.render();
    }
});
</script>
@endpush
