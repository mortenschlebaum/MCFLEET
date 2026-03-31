<?php
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Module;
use Illuminate\Http\Request;

class ModuleController extends Controller
{
    public function index()
    {
        $modules    = Module::with('category')->orderBy('code')->get();
        $categories = Category::orderBy('name')->get();
        return view('admin.modules.index', compact('modules', 'categories'));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'                     => 'required|string|max:100',
            'code'                     => 'required|string|max:20|unique:modules,code',
            'default_duration_minutes' => 'required|integer|min:0',
            'color'                    => 'required|string|max:7',
            'category_id'              => 'nullable|exists:categories,id',
        ]);
        Module::create($data);
        return back()->with('success', 'Modul oprettet.');
    }

    public function update(Request $request, Module $module)
    {
        $data = $request->validate([
            'name'                     => 'required|string|max:100',
            'code'                     => 'required|string|max:20|unique:modules,code,' . $module->id,
            'default_duration_minutes' => 'required|integer|min:0',
            'color'                    => 'required|string|max:7',
            'category_id'              => 'nullable|exists:categories,id',
        ]);
        $module->update($data);
        return back()->with('success', 'Modul opdateret.');
    }

    public function destroy(Module $module)
    {
        if ($module->templateEntries()->exists()) {
            return back()->with('error', 'Kan ikke slette modul der bruges i skabeloner.');
        }
        $module->delete();
        return back()->with('success', 'Modul slettet.');
    }
}