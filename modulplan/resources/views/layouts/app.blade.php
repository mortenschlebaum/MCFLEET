<!DOCTYPE html>
<html lang="da">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>@yield('title', 'Modulplan') — Køreskole</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/fullcalendar@6.1.11/index.global.min.css">
    <script src="https://cdn.jsdelivr.net/npm/fullcalendar@6.1.11/index.global.min.js"></script>
    <style>
        [x-cloak] { display: none !important; }
        .fc-event { cursor: pointer; font-size: 0.75rem; }
    </style>
    @stack('head')
</head>
<body class="bg-gray-100 min-h-screen font-sans">

<nav class="bg-gray-900 text-white shadow-lg">
    <div class="max-w-screen-xl mx-auto px-4 flex items-center justify-between h-14">
        <a href="/" class="font-bold text-lg tracking-wide flex items-center gap-2">
            <span class="text-red-500">📅</span> Modulplan
        </a>
        <div class="flex items-center gap-6 text-sm">
            <a href="/" class="hover:text-red-400 transition {{ request()->is('/') ? 'text-red-400 font-semibold' : '' }}">Kalender</a>
            <div x-data="{ open: false }" class="relative">
                <button @click="open = !open" class="hover:text-red-400 transition flex items-center gap-1 {{ request()->is('admin/*') ? 'text-red-400 font-semibold' : '' }}">
                    Admin <span x-text="open ? '▲' : '▼'" class="text-xs"></span>
                </button>
                <div x-show="open" x-cloak @click.away="open = false"
                     class="absolute right-0 mt-2 w-52 bg-white text-gray-800 rounded shadow-lg z-50 py-1">
                    <a href="/admin/classes" class="block px-4 py-2 hover:bg-gray-100 text-sm">Hold</a>
                    <a href="/admin/blocked-dates" class="block px-4 py-2 hover:bg-gray-100 text-sm">Helligdage & Ferier</a>
                    <hr class="my-1">
                    <a href="/admin/templates" class="block px-4 py-2 hover:bg-gray-100 text-sm">Skabeloner</a>
                    <a href="/admin/categories" class="block px-4 py-2 hover:bg-gray-100 text-sm">Kategorier</a>
                    <hr class="my-1">
                    <a href="/admin/cities" class="block px-4 py-2 hover:bg-gray-100 text-sm">Byer</a>
                    <a href="/admin/modules" class="block px-4 py-2 hover:bg-gray-100 text-sm">Moduler</a>
                </div>
            </div>
        </div>
    </div>
</nav>

<main class="max-w-screen-xl mx-auto px-4 py-6">
    @if(session('success'))
        <div x-data="{ show: true }" x-show="show" x-init="setTimeout(() => show = false, 4000)"
             class="mb-4 bg-green-100 border border-green-400 text-green-800 px-4 py-3 rounded flex justify-between items-center">
            <span>{{ session('success') }}</span>
            <button @click="show = false" class="text-green-600 hover:text-green-900 ml-4 font-bold">×</button>
        </div>
    @endif
    @if(session('error'))
        <div x-data="{ show: true }" x-show="show" x-init="setTimeout(() => show = false, 6000)"
             class="mb-4 bg-red-100 border border-red-400 text-red-800 px-4 py-3 rounded flex justify-between items-center">
            <span>{{ session('error') }}</span>
            <button @click="show = false" class="text-red-600 hover:text-red-900 ml-4 font-bold">×</button>
        </div>
    @endif
    @yield('content')
</main>

@stack('scripts')
</body>
</html>