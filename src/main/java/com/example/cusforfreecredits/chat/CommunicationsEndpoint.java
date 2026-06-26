package com.example.cusforfreecredits.chat;

import com.example.cusforfreecredits.config.ChatProperties;
import com.fasterxml.jackson.databind.JsonNode;
import io.fluxzero.common.serialization.JsonUtils;
import io.fluxzero.sdk.web.HandleGet;
import io.fluxzero.sdk.web.Path;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Proxies the n8n Gmail webhook so the browser never sees the n8n URL or any credentials,
 * and normalises the Gmail node output into a flat shape the frontend can render directly.
 */
@Component
@Path("/api")
@RequiredArgsConstructor
@Slf4j
public class CommunicationsEndpoint {

    private static final Duration TIMEOUT = Duration.ofSeconds(30);
    private static final HttpClient HTTP = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    private final ChatProperties properties;

    public record Email(String id,
                        String threadId,
                        String from,
                        String to,
                        String subject,
                        String snippet,
                        String date,
                        List<String> labels) {
    }

    public record CommunicationsResponse(List<Email> emails, String error) {
    }

    @HandleGet("/communications")
    CommunicationsResponse list() {
        String url = properties.getN8n().getCommunicationsUrl();
        if (url == null || url.isBlank()) {
            return new CommunicationsResponse(List.of(),
                    "Communications backend is not configured (missing N8N_COMMUNICATIONS_URL).");
        }
        HttpRequest.Builder reqBuilder = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(TIMEOUT)
                .header("Accept", "application/json")
                .GET();
        String secret = properties.getN8n().getWebhookSecret();
        if (secret != null && !secret.isBlank()) {
            reqBuilder.header("X-Webhook-Secret", secret);
        }
        try {
            HttpResponse<String> response = HTTP.send(reqBuilder.build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 400) {
                log.warn("communications webhook returned {}: {}", response.statusCode(), response.body());
                return new CommunicationsResponse(List.of(),
                        "Gmail backend returned HTTP " + response.statusCode());
            }
            return new CommunicationsResponse(parseEmails(response.body()), null);
        } catch (java.io.IOException | InterruptedException e) {
            if (e instanceof InterruptedException) Thread.currentThread().interrupt();
            log.warn("communications webhook call failed: {}", e.getMessage());
            return new CommunicationsResponse(List.of(), "Could not reach Gmail backend: " + e.getMessage());
        }
    }

    private List<Email> parseEmails(String body) {
        if (body == null || body.isBlank()) return List.of();
        JsonNode root = JsonUtils.fromJson(body, JsonNode.class);
        JsonNode arr = root.isArray() ? root : root.path("emails");
        if (!arr.isArray()) return List.of();
        List<Email> out = new ArrayList<>(arr.size());
        for (JsonNode n : arr) {
            List<String> labels = new ArrayList<>();
            JsonNode labelsNode = n.path("labels");
            if (labelsNode.isArray()) {
                for (JsonNode l : labelsNode) {
                    String name = l.isTextual() ? l.asText() : l.path("name").asText(null);
                    if (name != null && !name.isBlank()) labels.add(name);
                }
            }
            out.add(new Email(
                    text(n, "id"),
                    text(n, "threadId"),
                    firstNonBlank(text(n, "From"), text(n, "from")),
                    firstNonBlank(text(n, "To"), text(n, "to")),
                    firstNonBlank(text(n, "Subject"), text(n, "subject")),
                    text(n, "snippet"),
                    firstNonBlank(text(n, "internalDate"), text(n, "date")),
                    labels));
        }
        return out;
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
}
