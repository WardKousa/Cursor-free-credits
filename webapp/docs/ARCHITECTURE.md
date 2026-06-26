# mooizicht — CRM / Sales Agent Assistant Architecture

This is the source-of-truth architecture for the mooizicht voice-powered CRM / sales
outreach assistant. The webapp (this Vite + React app) is the front end; an n8n backend
runs the AI agents; Google Sheets is the system of record.

## Stack at a glance

| Layer        | Tool                     | Role                                                        |
| ------------ | ------------------------ | ---------------------------------------------------------- |
| Webapp       | Vite + React (this repo) | UI, voice in/out, renders CRM, sends prompts to n8n        |
| Voice input  | ElevenLabs STT           | Transcribes the user's speech to text                      |
| Voice output | ElevenLabs TTS           | Speaks the agent's reply back                              |
| Agent logic  | n8n AI Agent             | Orchestrator + specialist subagents                        |
| Scraping     | Apify                    | Finds ICP companies                                        |
| Storage      | Google Sheets            | Source of truth, human-editable; handoff layer for agents  |

The webapp has **no database** — Google Sheets is the database. n8n reads/writes it and the
app renders what's there.

## Request flow

```
Webapp (voice or text prompt)
    │  POST /webhook/crm-agent   { prompt, history, sessionId?, context? }
    ▼
n8n Orchestrator → subagents → tools → Google Sheets
    │  Respond to Webhook
    ▼
Webapp receives { reply, action_taken, needs_refresh }
    ├── renders reply (text + ElevenLabs TTS)
    └── if needs_refresh → re-fetch CRM table
```

- **Voice in:** browser mic → ElevenLabs STT → text prompt. The STT call should go through a
  thin backend route, not expose the ElevenLabs key in frontend JS.
- **Send:** `POST` JSON to the n8n Webhook trigger node (`{{ $json.prompt }}` becomes the user
  message to the agent). Add an `X-Webhook-Secret` header; verify it in n8n.
- **CRM table:** fetched independently (separate `GET /webhook/crm-data`, or Sheets API), and
  refreshed on a poll (15–30s) or whenever `needs_refresh` is true. No WebSocket needed.

### Conversation memory (chosen approach)

The webapp keeps the conversation array in memory and sends it on every call (zero n8n
changes). Cap it client-side (e.g. last 20 messages). History resets on refresh, which is fine
for focused work sessions.

```js
body: JSON.stringify({ prompt, history: sessionHistory.slice(-20) })
```

Upgrade path if needed: n8n Window Buffer Memory keyed by a `sessionId`, or Postgres/Supabase
chat memory for multi-user scale.

## n8n agent topology — Orchestrator + 3 flat subagents

Keep the subagents **flat** (all direct children of the orchestrator), not nested. The
orchestrator never acts directly; it routes intent and assembles the response.

```
Webhook → ORCHESTRATOR AGENT (+ memory)
            ├── CRM Agent          ← reads/writes the spreadsheet
            ├── ICP Research Agent ← Apify + web search + GDrive profile docs
            └── Outreach Agent     ← sends email, reads CRM for who to contact
```

- **Loopback (ReAct) by default:** each tool/subagent result returns to the orchestrator's
  context before it decides the next step. Set a **max iterations cap** (10–15) on every agent.
- Each subworkflow uses **"When Called by Another Workflow"** as its trigger (not a Webhook).

### Sharing data between agents

1. **Orchestrator passes data explicitly** (default) — holds results, injects structured input
   into the next agent: `{ task, company_id, user_context }`, never a raw string.
2. **Google Sheets as the handoff layer** (for large data) — e.g. the Outreach Agent just reads
   `status = "Uncontacted"` rows. The sheet is the queue.
3. **Structured JSON output schema** (required for reliability), e.g.:
   - CRM Agent → `{ "status": "success|error", "rows_affected": n, "message": "..." }`
   - ICP Research → `{ "status": "success|error", "companies": [...], "total_found": n }`
   - Outreach → `{ "status": "success|error", "emails_sent": n, "failed": [...] }`

## Tools (each agent action = one narrow tool / sub-workflow)

| Tool                | Does                                         | n8n node                |
| ------------------- | -------------------------------------------- | ----------------------- |
| `GetAllContacts`    | Fetch all rows for display                   | Sheets: Get Rows        |
| `SearchCompany`     | Look up by name / domain                     | Sheets: Get Row(s)      |
| `AddCompany`        | Append a new ICP row (dedupe first)          | Sheets: Append Row      |
| `UpdateStatus`      | Set the status field by `company_id`         | Sheets: Update Row      |
| `UpdateNotes`       | Append to the Notes column                   | Sheets: Update Row      |
| `RunApifyScrape`    | Trigger an Apify actor to find ICPs          | HTTP Request → Apify    |
| `EnrichCompany`     | Pull extra data (LinkedIn, revenue, etc.)    | HTTP Request            |
| `ReadKnowledgeBase` | Read business/ICP profile docs (called first)| Google Drive            |
| `SendEmail`         | Send outreach (hard pre-send validation)     | Email node              |

Keep operations as separate narrow tools (easier to debug, safer — no accidental deletes,
composable). Destructive actions (deleting rows) are **not** exposed as tools — manual only.

## Google Sheets — CRM columns

**Core identity:** `company_id` (match key — `ACME_001` or UUID; never match on name),
`company_name`, `website`, `linkedin_url`, `industry`, `company_size`, `location`, `description`.

**ICP fit:** `icp_score` (0–100), `icp_match_reason`, `source`.

**Contact:** `contact_name`, `contact_title`, `contact_email`, `contact_linkedin`,
`email_confidence` (`Verified` | `Likely` | `Company Only` | `Unknown`).

**Outreach & status:** `status`, `outreach_email_sent` (actual body), `last_contacted_date`,
`reply_received`, `reply_summary`, `follow_up_date`, `next_action`.

**Meta:** `date_added`, `last_updated`, `notes` (freeform escape hatch).

> n8n writes plain text to cells. The dropdown is a **Data Validation** rule set up once
> manually in Sheets; n8n just writes a conforming value.

### Status enum (exact values — define in the CRM Agent system prompt)

```
Uncontacted, Awaiting Reply, Rejected, Counter Rejection, Owner Input Needed,
Meeting Booked, Shutdown
```

| Status            | Trigger                              | Agent action                                  |
| ----------------- | ------------------------------------ | --------------------------------------------- |
| Uncontacted       | Row created by Research Agent        | Outreach Agent queues for email               |
| Awaiting Reply    | First email sent                     | Sets `last_contacted_date`                    |
| Rejected          | Reply parsed as negative             | Orchestrator flags for counter strategy       |
| Counter Rejection | Counter-pitch sent                   | Updates `outreach_email_sent`, resets date    |
| Owner Input Needed| Ambiguous / edge case                | Notify human, pause automation                |
| Meeting Booked    | Reply confirms meeting               | Terminal success                              |
| Shutdown          | Rejected again after counter         | Terminal failure, never emailed again         |

- Outreach Agent **hard-filters out** `Shutdown`, `Meeting Booked`, `Owner Input Needed`.
- `Counter Rejection` is the only status where a second email is sent autonomously.
- Enforce the enum in **three places**: orchestrator prompt, CRM Agent prompt, and the
  `UpdateStatus` tool description. If unsure, set `Owner Input Needed`.

## Contacts / email strategy (MVP)

Company emails are acceptable for the MVP, but the Research Agent should **prioritise**:
1. Named individual (`jan@acme.com`)
2. Role-specific (`sales@acme.com`, `hello@acme.com`)
3. Generic (`info@`, `contact@`, `support@`) — note the type in `notes`.

Later upgrade: Apify LinkedIn people search → Hunter.io / Apollo for verified emails, gated by
`email_confidence` (only auto-send `Verified`/`Likely`; everything else → `Owner Input Needed`).

## Key considerations

- **CORS:** n8n webhook must allow the webapp origin.
- **Auth:** secret header on every webhook call.
- **Latency:** for a real-time feel, use ElevenLabs realtime STT and stream the n8n response.
- **Logging:** pipe each tool-call result to a logging workflow (separate Sheets tab / Supabase)
  for debuggability.

## Build order

1. n8n webhook → orchestrator → Respond to Webhook with a dummy reply.
2. CRM Agent + Sheets tools.
3. Webapp CRM table display.
4. ICP Research + Apify.
5. Outreach Agent.
6. ElevenLabs voice on the frontend.
