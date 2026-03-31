<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('course_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->unsignedInteger('weeks');
            $table->unsignedTinyInteger('frequency')->default(1)->comment('Sessions per week: 1 or 2');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_templates');
    }
};
