/**
 * Voice + chat transport adapters.
 * <p>
 * Endpoints here are thin proxies: the chat endpoint forwards the user's prompt and conversation
 * history to the n8n CRM orchestrator webhook, and the voice endpoints proxy ElevenLabs STT/TTS so
 * the API key never reaches the browser. None of this layer owns business state — the CRM source of
 * truth lives in Google Sheets, mediated by n8n.
 * <p>
 * These endpoints are intentionally unauthenticated for hackathon development. Add
 * {@code @RequiresUser} once the BFF session is wired into the frontend.
 */
@NoUserRequired
package com.example.cusforfreecredits.chat;

import io.fluxzero.sdk.tracking.handling.authentication.NoUserRequired;
