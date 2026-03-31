<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('classes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('city_id')->constrained()->cascadeOnDelete();
            $table->foreignId('course_template_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->date('start_date');
            $table->time('start_time');
            $table->unsignedTinyInteger('frequency')->default(1)->comment('1 or 2 times per week');
            $table->enum('holiday_strategy', ['next_valid', 'flag', 'manual', 'shift_all'])->default('next_valid');
            $table->enum('status', ['active', 'completed', 'cancelled'])->default('active');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('classes');
    }
};
