<?php
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    public function index()
    {
        $categories = Category::withCount('classes')->orderBy('name')->get();
        return view('admin.categories.index', compact('categories'));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'  => 'required|string|max:100|unique:categories,name',
            'color' => 'required|string|max:7',
        ]);
        Category::create($data);
        return back()->with('success', 'Kategori oprettet.');
    }

    public function update(Request $request, Category $category)
    {
        $data = $request->validate([
            'name'  => 'required|string|max:100|unique:categories,name,' . $category->id,
            'color' => 'required|string|max:7',
        ]);
        $category->update($data);
        return back()->with('success', 'Kategori opdateret.');
    }

    public function destroy(Category $category)
    {
        $category->delete();
        return back()->with('success', 'Kategori slettet.');
    }
}