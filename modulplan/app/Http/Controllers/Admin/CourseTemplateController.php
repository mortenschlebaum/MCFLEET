<?php
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\CourseTemplate;
use App\Models\CourseTemplateEntry;
use App\Models\Module;
use Illuminate\Http\Request;

class CourseTemplateController extends Controller
{
    public function index()
    {
        $templates  = CourseTemplate::with('category')->withCount('entries')->orderBy('name')->get();
        $categories = Category::orderBy('name')->get();
        $templatesByCategory = $templates->groupBy(fn ($t) => $t->category?->name ?? 'Uden kategori');
        return view('admin.templates.index', compact('templates', 'categories', 'templatesByCategory'));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'        => 'required|string|max:100',
            'weeks'       => 'required|integer|min:1',
            'frequency'   => 'required|integer|min:1|max:7',
            'category_id' => 'nullable|exists:categories,id',
        ]);
        CourseTemplate::create($data);
        return back()->with('success', 'Skabelon oprettet.');
    }

    public function update(Request $request, CourseTemplate $template)
    {
        $data = $request->validate([
            'name'        => 'required|string|max:100',
            'weeks'       => 'required|integer|min:1',
            'frequency'   => 'required|integer|min:1|max:7',
            'category_id' => 'nullable|exists:categories,id',
        ]);
        $template->update($data);
        return back()->with('success', 'Skabelon opdateret.');
    }

    public function destroy(CourseTemplate $template)
    {
        if ($template->classes()->exists()) {
            return back()->with('error', 'Kan ikke slette skabelon der bruges af hold.');
        }
        $template->delete();
        return back()->with('success', 'Skabelon slettet.');
    }

    public function entries(CourseTemplate $template)
    {
        $entries = $template->entries()->with('module')->orderBy('sort_order')->get();
        $modules = $template->category_id
            ? Module::where('category_id', $template->category_id)->orderBy('code')->get()
            : Module::orderBy('code')->get();
        return view('admin.templates.entries', compact('template', 'entries', 'modules'));
    }

    public function addEntry(Request $request, CourseTemplate $template)
    {
        $data = $request->validate([
            'type'       => 'required|in:module,pause',
            'module_id'  => 'nullable|exists:modules,id',
            'skip_slots' => 'nullable|integer|min:0',
        ]);

        $maxSort = $template->entries()->max('sort_order') ?? 0;

        CourseTemplateEntry::create([
            'course_template_id' => $template->id,
            'sort_order'         => $maxSort + 1,
            'type'               => $data['type'],
            'module_id'          => $data['type'] === 'module' ? $data['module_id'] : null,
            'skip_slots'         => $data['type'] === 'pause' ? ($data['skip_slots'] ?? 1) : 0,
        ]);

        return back()->with('success', 'Række tilføjet.');
    }

    public function removeEntry(CourseTemplate $template, CourseTemplateEntry $entry)
    {
        $entry->delete();
        $this->reindex($template);
        return back()->with('success', 'Række slettet.');
    }

    public function moveUp(CourseTemplate $template, CourseTemplateEntry $entry)
    {
        $prev = $template->entries()
            ->where('sort_order', '<', $entry->sort_order)
            ->orderBy('sort_order', 'desc')
            ->first();

        if ($prev) {
            [$entry->sort_order, $prev->sort_order] = [$prev->sort_order, $entry->sort_order];
            $entry->save();
            $prev->save();
        }

        return back();
    }

    public function moveDown(CourseTemplate $template, CourseTemplateEntry $entry)
    {
        $next = $template->entries()
            ->where('sort_order', '>', $entry->sort_order)
            ->orderBy('sort_order')
            ->first();

        if ($next) {
            [$entry->sort_order, $next->sort_order] = [$next->sort_order, $entry->sort_order];
            $entry->save();
            $next->save();
        }

        return back();
    }

    private function reindex(CourseTemplate $template): void
    {
        $entries = $template->entries()->orderBy('sort_order')->get();
        foreach ($entries as $i => $e) {
            $e->update(['sort_order' => $i + 1]);
        }
    }
}
