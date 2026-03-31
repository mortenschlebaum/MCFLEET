<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('class_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('class_id')->constrained('classes')->cascadeOnDelete();
            $table->foreignId('course_template_entry_id')->constrained()->cascadeOnDelete();
            $table->date('scheduled_date');
            $table->date('actual_date')->nullable();
            $table->time('start_time');
            $table->time('end_time');
            $table->unsignedInteger('duration_minutes');
            $table->enum('status', ['scheduled', 'completed', 'cancelled', 'moved'])->default('scheduled');
            $table->boolean('conflict')->default(false);
            $table->string('move_reason')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('class_sessions');
    }
};
