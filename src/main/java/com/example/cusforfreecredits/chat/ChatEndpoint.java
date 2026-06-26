package com.example.cusforfreecredits.chat;

import com.example.cusforfreecredits.config.ChatProperties;
import com.fasterxml.jackson.databind.JsonNode;
import io.fluxzero.common.serialization.JsonUtils;
import io.fluxzero.sdk.web.HandlePost;
import io.fluxzero.sdk.web.Path;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Browser-facing chat endpoint that forwards each user message to the n8n CRM orchestrator agent.
 * The full conversation history is owned by the webapp (see CRM doc, "Option 3") and posted on
 * every call, so n8n stays stateless.
 */
@Component
@Path("/api")
@RequiredArgsConstructor
@Slf4j
public class ChatEndpoint {

    private static final Duration N8N_TIMEOUT = Duration.ofSeconds(60);
    private static final HttpClient HTTP = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    private final ChatProperties properties;

    public record ChatRequest(String prompt,
                              List<Map<String, String>> history,
                              String sessionId,
                              Map<String, Object> context) {
    }

    public record ChatResponse(String reply,
                               boolean needsRefresh,
                               String actionTaken,
                               Map<String, Object> raw) {
    }

    @HandlePost("/chat")
    ChatResponse chat(ChatRequest body) {
        String webhookUrl = properties.getN8n().getWebhookUrl();
        if (webhookUrl == null || webhookUrl.isBlank()) {
            log.warn("n8n webhook URL not configured");
            return new ChatResponse("Chat backend is not configured (missing N8N_WEBHOOK_URL).",
                    false, null, Map.of());
        }
        if (body == null || body.prompt() == null || body.prompt().isBlank()) {
            return new ChatResponse("Please provide a prompt.", false, null, Map.of());
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("prompt", body.prompt());
        payload.put("history", body.history() == null ? List.of() : body.history());
        if (body.sessionId() != null) payload.put("sessionId", body.sessionId());
        if (body.context() != null) payload.put("context", body.context());

        HttpRequest.Builder reqBuilder = HttpRequest.newBuilder()
                .uri(URI.create(webhookUrl))
                .timeout(N8N_TIMEOUT)
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(JsonUtils.asJson(payload)));
        String secret = properties.getN8n().getWebhookSecret();
        if (secret != null && !secret.isBlank()) {
            reqBuilder.header("X-Webhook-Secret", secret);
        }

        try {
            HttpResponse<String> response = HTTP.send(reqBuilder.build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 400) {
                log.warn("n8n webhook returned {}: {}", response.statusCode(), truncate(response.body()));
                return new ChatResponse(
                        "The agent backend returned an error (HTTP " + response.statusCode() + ").",
                        false, null, Map.of("status", response.statusCode(), "body", truncate(response.body())));
            }
            return parseAgentResponse(response.body());
        } catch (java.io.IOException | InterruptedException e) {
            if (e instanceof InterruptedException) Thread.currentThread().interrupt();
            log.warn("n8n webhook call failed: {}", e.getMessage());
            return new ChatResponse(
                    "Could not reach the agent backend right now. Please try again.",
                    false, null, Map.of("error", e.getMessage()));
        }
    }

    private ChatResponse parseAgentResponse(String body) {
        if (body == null || body.isBlank()) {
            return new ChatResponse("(agent returned an empty response)", false, null, Map.of());
        }
        JsonNode node;
        try {
            node = JsonUtils.fromJson(body, JsonNode.class);
        } catch (RuntimeException e) {
            // n8n responded with plain text; treat the whole body as the reply.
            return new ChatResponse(body.trim(), false, null, Map.of());
        }
        if (node.isArray() && node.size() > 0) {
            node = node.get(0);
        }
        String reply = firstNonBlank(
                text(node, "reply"),
                text(node, "output"),
                text(node, "message"),
                text(node, "text"),
                text(node, "response"));
        if (reply == null) reply = node.toString();

        boolean needsRefresh = node.path("needs_refresh").asBoolean(false)
                || node.path("needsRefresh").asBoolean(false);
        String action = firstNonBlank(text(node, "action_taken"), text(node, "actionTaken"));

        Map<String, Object> raw = JsonUtils.fromJson(body, Map.class) instanceof Map<?, ?> m
                ? cast(m) : Map.of();
        return new ChatResponse(reply, needsRefresh, action, raw);
    }

    private static String text(JsonNode node, String field) {
        JsonNode v = node.path(field);
        if (v.isMissingNode() || v.isNull()) return null;
        String s = v.isTextual() ? v.asText() : v.toString();
        return s.isBlank() ? null : s;
    }

    private static String firstNonBlank(String... values) {
        for (String v : values) if (v != null && !v.isBlank()) return v;
        return null;
    }

    private static String truncate(String s) {
        if (s == null) return null;
        return s.length() <= 500 ? s : s.substring(0, 500) + "...";
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> cast(Map<?, ?> raw) {
        return (Map<String, Object>) raw;
    }
}
