<?php

use App\Http\Controllers\CalendarController;
use App\Http\Controllers\Admin\ClassController;
use App\Http\Controllers\Admin\SessionController;
use App\Http\Controllers\Admin\BlockedDateController;
use App\Http\Controllers\Admin\CategoryController;
use App\Http\Controllers\Admin\CityController;
use App\Http\Controllers\Admin\CourseTemplateController;
use App\Http\Controllers\Admin\ModuleController;
use Illuminate\Support\Facades\Route;

Route::get('/', [CalendarController::class, 'index'])->name('calendar.index');

Route::prefix('admin')->name('admin.')->group(function () {

    // Hold
    Route::get('classes/preview-series', [ClassController::class, 'previewSeries'])->name('classes.preview-series');
    Route::post('classes/{class}/regenerate', [ClassController::class, 'regenerate'])->name('classes.regenerate');
    Route::resource('classes', ClassController::class)->except(['show']);

    // Sessioner
    Route::post('classes/{class}/sessions/{session}/move', [SessionController::class, 'move'])
        ->name('classes.sessions.move');
    Route::post('classes/{class}/sessions/regenerate', [SessionController::class, 'regenerate'])
        ->name('classes.sessions.regenerate');
    Route::get('classes/{class}/sessions', [SessionController::class, 'index'])
        ->name('classes.sessions.index');

    // Helligdage & ferier
    Route::post('blocked-dates/import-year', [BlockedDateController::class, 'importYear'])
        ->name('blocked-dates.import-year');
    Route::delete('blocked-dates/range', [BlockedDateController::class, 'destroyRange'])
        ->name('blocked-dates.destroy-range');
    Route::resource('blocked-dates', BlockedDateController::class)->only(['index', 'store', 'destroy']);

    // Skabeloner (CRUD + rækkefølge-editor)
    Route::resource('templates', CourseTemplateController::class)->except(['show', 'create', 'edit']);
    Route::get('templates/{template}/entries', [CourseTemplateController::class, 'entries'])->name('templates.entries');
    Route::post('templates/{template}/entries', [CourseTemplateController::class, 'addEntry'])->name('templates.entries.add');
    Route::delete('templates/{template}/entries/{entry}', [CourseTemplateController::class, 'removeEntry'])->name('templates.entries.remove');
    Route::post('templates/{template}/entries/{entry}/move-up', [CourseTemplateController::class, 'moveUp'])->name('templates.entries.move-up');
    Route::post('templates/{template}/entries/{entry}/move-down', [CourseTemplateController::class, 'moveDown'])->name('templates.entries.move-down');

    // Kategorier
    Route::resource('categories', CategoryController::class)->except(['show', 'create', 'edit']);

    // Byer & moduler
    Route::resource('cities', CityController::class)->except(['show', 'create', 'edit']);
    Route::resource('modules', ModuleController::class)->except(['show', 'create', 'edit']);
});