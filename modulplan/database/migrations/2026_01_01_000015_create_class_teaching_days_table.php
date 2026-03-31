<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('class_teaching_days', function (Blueprint $table) {
            $table->id();
            $table->foreignId('class_id')->constrained('classes')->cascadeOnDelete();
            $table->unsignedTinyInteger('day_of_week')->comment('ISO 1=Monday ... 7=Sunday');
            $table->unique(['class_id', 'day_of_week']);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('class_teaching_days');
    }
};
