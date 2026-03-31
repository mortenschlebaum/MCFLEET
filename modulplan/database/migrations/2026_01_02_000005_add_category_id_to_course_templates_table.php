<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('course_templates', function (Blueprint $table) {
            $table->foreignId('category_id')->nullable()->after('frequency')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('course_templates', function (Blueprint $table) {
            $table->dropForeignIdFor(\App\Models\Category::class);
            $table->dropColumn('category_id');
        });
    }
};
