package com.example.cusforfreecredits.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app")
public class ChatProperties {

    private final N8n n8n = new N8n();
    private final ElevenLabs elevenlabs = new ElevenLabs();

    public N8n getN8n() {
        return n8n;
    }

    public ElevenLabs getElevenlabs() {
        return elevenlabs;
    }

    public static class N8n {
        private String webhookUrl;
        private String webhookSecret;

        public String getWebhookUrl() {
            return webhookUrl;
        }

        public void setWebhookUrl(String webhookUrl) {
            this.webhookUrl = webhookUrl;
        }

        public String getWebhookSecret() {
            return webhookSecret;
        }

        public void setWebhookSecret(String webhookSecret) {
            this.webhookSecret = webhookSecret;
        }
    }

    public static class ElevenLabs {
        private String apiKey;
        private String voiceId = "21m00Tcm4TlvDq8ikWAM";
        private String sttModel = "scribe_v1";

        public String getApiKey() {
            return apiKey;
        }

        public void setApiKey(String apiKey) {
            this.apiKey = apiKey;
        }

        public String getVoiceId() {
            return voiceId;
        }

        public void setVoiceId(String voiceId) {
            this.voiceId = voiceId;
        }

        public String getSttModel() {
            return sttModel;
        }

        public void setSttModel(String sttModel) {
            this.sttModel = sttModel;
        }
    }
}
