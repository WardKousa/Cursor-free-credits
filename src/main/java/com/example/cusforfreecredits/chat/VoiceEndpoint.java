package com.example.cusforfreecredits.chat;

import com.example.cusforfreecredits.config.ChatProperties;
import com.fasterxml.jackson.databind.JsonNode;
import io.fluxzero.common.serialization.JsonUtils;
import io.fluxzero.sdk.web.FormParam;
import io.fluxzero.sdk.web.HandlePost;
import io.fluxzero.sdk.web.Path;
import io.fluxzero.sdk.web.WebResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Server-side proxy for ElevenLabs Speech-to-Text and Text-to-Speech.
 * <p>
 * The browser never sees the ElevenLabs API key. The webapp records audio via MediaRecorder, posts
 * the blob to {@code /api/voice/transcribe}, and gets back the transcription text. To speak a reply,
 * the webapp posts the text to {@code /api/voice/tts} and pipes the returned audio into an
 * {@code <audio>} element.
 */
@Component
@Path("/api/voice")
@RequiredArgsConstructor
@Slf4j
public class VoiceEndpoint {

    private static final Duration TIMEOUT = Duration.ofSeconds(60);
    private static final HttpClient HTTP = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();
    private static final String STT_URL = "https://api.elevenlabs.io/v1/speech-to-text";
    private static final String TTS_URL_PREFIX = "https://api.elevenlabs.io/v1/text-to-speech/";

    private final ChatProperties properties;

    public record TranscribeResponse(String text) {
    }

    public record TtsRequest(String text, String voiceId, String modelId) {
    }

    @HandlePost("/transcribe")
    WebResponse transcribe(@FormParam byte[] file,
                           @FormParam String contentType,
                           @FormParam String filename) {
        String apiKey = properties.getElevenlabs().getApiKey();
        if (apiKey == null || apiKey.isBlank()) {
            return jsonError(503, "ElevenLabs API key not configured.");
        }
        if (file == null || file.length == 0) {
            return jsonError(400, "Missing audio file in form field 'file'.");
        }
        String type = contentType != null && !contentType.isBlank() ? contentType : "audio/webm";
        String name = filename != null && !filename.isBlank() ? filename : "recording.webm";

        String boundary = "----flux" + UUID.randomUUID();
        byte[] body;
        try {
            body = buildMultipart(boundary, file, name, type, properties.getElevenlabs().getSttModel());
        } catch (IOException e) {
            log.warn("Failed to build STT multipart body: {}", e.getMessage());
            return jsonError(500, "Failed to build upload body.");
        }

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(STT_URL))
                .timeout(TIMEOUT)
                .header("xi-api-key", apiKey)
                .header("Accept", "application/json")
                .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                .POST(HttpRequest.BodyPublishers.ofByteArray(body))
                .build();

        try {
            HttpResponse<String> response = HTTP.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 400) {
                log.warn("ElevenLabs STT returned {}: {}", response.statusCode(), truncate(response.body()));
                return jsonError(response.statusCode(), "Transcription failed: " + truncate(response.body()));
            }
            String text;
            try {
                JsonNode node = JsonUtils.fromJson(response.body(), JsonNode.class);
                JsonNode textNode = node.path("text");
                text = textNode.isMissingNode() ? response.body() : textNode.asText("");
            } catch (RuntimeException e) {
                text = response.body();
            }
            return jsonOk(new TranscribeResponse(text == null ? "" : text.trim()));
        } catch (IOException | InterruptedException e) {
            if (e instanceof InterruptedException) Thread.currentThread().interrupt();
            log.warn("STT call failed: {}", e.getMessage());
            return jsonError(502, "Could not reach ElevenLabs: " + e.getMessage());
        }
    }

    @HandlePost("/tts")
    WebResponse tts(TtsRequest body) {
        String apiKey = properties.getElevenlabs().getApiKey();
        if (apiKey == null || apiKey.isBlank()) {
            return jsonError(503, "ElevenLabs API key not configured.");
        }
        if (body == null || body.text() == null || body.text().isBlank()) {
            return jsonError(400, "Missing 'text' field.");
        }
        String voiceId = body.voiceId() != null && !body.voiceId().isBlank()
                ? body.voiceId()
                : properties.getElevenlabs().getVoiceId();
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("text", body.text());
        payload.put("model_id", body.modelId() != null && !body.modelId().isBlank()
                ? body.modelId() : "eleven_turbo_v2_5");
        payload.put("voice_settings", Map.of("stability", 0.5, "similarity_boost", 0.75));

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(TTS_URL_PREFIX + voiceId))
                .timeout(TIMEOUT)
                .header("xi-api-key", apiKey)
                .header("Accept", "audio/mpeg")
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(JsonUtils.asJson(payload)))
                .build();

        try {
            HttpResponse<byte[]> response = HTTP.send(request, HttpResponse.BodyHandlers.ofByteArray());
            if (response.statusCode() >= 400) {
                String err = new String(response.body(), StandardCharsets.UTF_8);
                log.warn("ElevenLabs TTS returned {}: {}", response.statusCode(), truncate(err));
                return jsonError(response.statusCode(), "TTS failed: " + truncate(err));
            }
            return WebResponse.builder()
                    .status(200)
                    .contentType("audio/mpeg")
                    .header("Cache-Control", "no-store")
                    .payload(response.body())
                    .build();
        } catch (IOException | InterruptedException e) {
            if (e instanceof InterruptedException) Thread.currentThread().interrupt();
            log.warn("TTS call failed: {}", e.getMessage());
            return jsonError(502, "Could not reach ElevenLabs: " + e.getMessage());
        }
    }

    private static byte[] buildMultipart(String boundary,
                                         byte[] fileBytes,
                                         String filename,
                                         String contentType,
                                         String modelId) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        // model_id text part
        writePart(out, boundary,
                "Content-Disposition: form-data; name=\"model_id\"\r\n\r\n" + modelId + "\r\n");
        // file part
        out.write(("--" + boundary + "\r\n").getBytes(StandardCharsets.UTF_8));
        out.write(("Content-Disposition: form-data; name=\"file\"; filename=\""
                + filename.replace("\"", "") + "\"\r\n").getBytes(StandardCharsets.UTF_8));
        out.write(("Content-Type: " + contentType + "\r\n\r\n").getBytes(StandardCharsets.UTF_8));
        out.write(fileBytes);
        out.write("\r\n".getBytes(StandardCharsets.UTF_8));
        // closing boundary
        out.write(("--" + boundary + "--\r\n").getBytes(StandardCharsets.UTF_8));
        return out.toByteArray();
    }

    private static void writePart(ByteArrayOutputStream out, String boundary, String partHeaderAndBody) throws IOException {
        out.write(("--" + boundary + "\r\n").getBytes(StandardCharsets.UTF_8));
        out.write(partHeaderAndBody.getBytes(StandardCharsets.UTF_8));
    }

    private static WebResponse jsonOk(Object payload) {
        return WebResponse.builder()
                .status(200)
                .contentType("application/json")
                .header("Cache-Control", "no-store")
                .payload(JsonUtils.asJson(payload))
                .build();
    }

    private static WebResponse jsonError(int status, String message) {
        return WebResponse.builder()
                .status(status)
                .contentType("application/json")
                .header("Cache-Control", "no-store")
                .payload(JsonUtils.asJson(Map.of("error", message)))
                .build();
    }

    private static String truncate(String s) {
        if (s == null) return null;
        return s.length() <= 500 ? s : s.substring(0, 500) + "...";
    }
}
