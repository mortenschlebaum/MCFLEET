<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('modules', function (Blueprint $table) {
            $table->string('color', 7)->default('#6b7280')->after('default_duration_minutes');
        });
    }
    public function down(): void {
        Schema::table('modules', function (Blueprint $table) {
            $table->dropColumn('color');
        });
    }
};