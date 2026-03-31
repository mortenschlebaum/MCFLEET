<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ClassSession;
use App\Models\CourseClass;
use App\Services\SessionGeneratorService;
use Illuminate\Http\Request;

class SessionController extends Controller
{
    public function index(CourseClass $class)
    {
        $sessions = $class->sessions()
            ->with('templateEntry.module')
            ->orderBy('scheduled_date')
            ->get();
        return view('admin.classes.sessions', compact('class', 'sessions'));
    }

    public function move(Request $request, CourseClass $class, ClassSession $session, SessionGeneratorService $generator)
    {
        $data = $request->validate([
            'new_date'         => 'required|date',
            'move_reason'      => 'nullable|string|max:255',
            'shift_subsequent' => 'nullable|boolean',
        ]);

        $session->update([
            'actual_date' => $data['new_date'],
            'status'      => 'moved',
            'conflict'    => false,
            'move_reason' => $data['move_reason'],
        ]);

        if (!empty($data['shift_subsequent'])) {
            $generator->shiftSubsequent($class, $session, $data['new_date']);
        }

        return back()->with('success', 'Session flyttet til ' . \Carbon\Carbon::parse($data['new_date'])->format('d/m/Y'));
    }

    public function regenerate(CourseClass $class, SessionGeneratorService $generator)
    {
        $generator->generate($class);
        return back()->with('success', 'Sessionsplan regenereret.');
    }
}
