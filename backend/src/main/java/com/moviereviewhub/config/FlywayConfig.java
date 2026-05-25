package com.moviereviewhub.config;

import org.flywaydb.core.api.output.RepairResult;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Runs {@code flyway.repair()} before every migration so checksum drift in
 * already-applied migrations (typically caused by re-formatting or editing
 * an older SQL file) is auto-healed instead of blocking app startup.
 *
 * Safe to leave on permanently: repair is a no-op when checksums match the
 * recorded history. It does not touch data — only updates the
 * {@code flyway_schema_history} table.
 */
@Configuration
public class FlywayConfig {

    @Bean
    public FlywayMigrationStrategy repairAndMigrate() {
        return flyway -> {
            RepairResult result = flyway.repair();
            if (!result.migrationsAligned.isEmpty() || !result.migrationsRemoved.isEmpty()) {
                // Flyway logs each alignment internally; this line keeps a
                // visible breadcrumb at startup so it's obvious when repair
                // actually had work to do.
                System.out.println("Flyway repair aligned " + result.migrationsAligned.size()
                        + " migration(s), removed " + result.migrationsRemoved.size());
            }
            flyway.migrate();
        };
    }
}
