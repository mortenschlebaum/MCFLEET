<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\City;
use Illuminate\Http\Request;

class CityController extends Controller
{
    public function index()
    {
        $cities = City::withCount('classes')->orderBy('name')->get();
        return view('admin.cities.index', compact('cities'));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:100',
            'code' => 'required|string|max:20|unique:cities,code',
        ]);
        City::create($data);
        return back()->with('success', 'By oprettet.');
    }

    public function update(Request $request, City $city)
    {
        $data = $request->validate([
            'name' => 'required|string|max:100',
            'code' => 'required|string|max:20|unique:cities,code,' . $city->id,
        ]);
        $city->update($data);
        return back()->with('success', 'By opdateret.');
    }

    public function destroy(City $city)
    {
        if ($city->classes()->exists()) {
            return back()->with('error', 'Kan ikke slette by med tilknyttede hold.');
        }
        $city->delete();
        return back()->with('success', 'By slettet.');
    }
}
