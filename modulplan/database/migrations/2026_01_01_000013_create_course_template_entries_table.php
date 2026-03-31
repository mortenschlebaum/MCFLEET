<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('course_template_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_template_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('sort_order');
            $table->enum('type', ['module', 'pause']);
            $table->foreignId('module_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedInteger('skip_slots')->default(0)->comment('Slots to skip for pause type');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_template_entries');
    }
};
