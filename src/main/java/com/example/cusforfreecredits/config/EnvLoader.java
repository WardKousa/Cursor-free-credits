package com.example.cusforfreecredits.config;

import lombok.extern.slf4j.Slf4j;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@Slf4j
public final class EnvLoader {
    private static final String DEFAULT_FILE = ".env";

    private EnvLoader() {
    }

    public static void loadDefault() {
        load(Paths.get(DEFAULT_FILE));
    }

    public static void load(Path envFile) {
        if (!Files.isRegularFile(envFile)) {
            log.debug("No .env file found at {}, skipping", envFile.toAbsolutePath());
            return;
        }
        List<String> lines;
        try {
            lines = Files.readAllLines(envFile);
        } catch (IOException e) {
            log.warn("Failed to read {}: {}", envFile, e.getMessage());
            return;
        }
        int applied = 0;
        for (String raw : lines) {
            String line = raw.strip();
            if (line.isEmpty() || line.startsWith("#")) {
                continue;
            }
            int eq = line.indexOf('=');
            if (eq <= 0) {
                continue;
            }
            String key = line.substring(0, eq).strip();
            String value = unquote(line.substring(eq + 1).strip());
            // Prefer real environment / system properties already present, so deployment overrides .env.
            if (System.getProperty(key) == null && System.getenv(key) == null) {
                System.setProperty(key, value);
                applied++;
            }
        }
        log.info("Loaded {} variable(s) from {}", applied, envFile.toAbsolutePath());
    }

    private static String unquote(String s) {
        if (s.length() >= 2
                && ((s.startsWith("\"") && s.endsWith("\""))
                || (s.startsWith("'") && s.endsWith("'")))) {
            return s.substring(1, s.length() - 1);
        }
        return s;
    }
}
