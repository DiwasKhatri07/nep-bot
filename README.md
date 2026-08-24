# NEP BOT

NEP BOT is an owner-controlled WhatsApp onboarding and management dashboard. It validates phone numbers using country-aware E.164 rules, persists non-sensitive bot configuration, guides linked-device pairing, and presents a clear command, activity, and moderation-control workspace.

> **Important:** The dashboard now includes a first-party linked-device connector. It does not display or store pairing codes in the database, and it encrypts server-side session snapshots. A linked-device session still needs an always-on runtime for reliable long-term operation.

## What is included

| Area | Included behavior |
| --- | --- |
| Dashboard | Responsive overview, bot profiles, guided setup, activity, command catalog, and owner controls. |
| Number validation | National-number formatting in the browser plus strict server-side validation and E.164 normalization in Python. |
| Pairing | A verified profile can request a short-lived pairing code from the first-party connector. Codes are returned only to the current owner session and are never written to the database. |
| Persistence | Bot profile settings, country-normalized setup data, feature switches, public/private mode, command preferences, and non-sensitive activity. |
| Controls | Owner-scoped public/private mode, anti-link, anti-call, auto-read, auto-react, group controls, and AI auto-reply preference. |
| Safety | No bulk-messaging workflow, no session exports, strict input lengths, per-owner profile checks, encrypted server-side session snapshots, and server-side secret handling. |

## Runtime architecture

The website runs as a Node/React application. The Node server invokes `python_service/nep_bot_service.py` for phone validation and optional LLM-provider work. The Python service uses `phonenumbers` to confirm that a selected country, calling code, and national number resolve to a valid E.164 number.

`server/whatsappConnector.ts` contains the first-party linked-device connector. It creates a Baileys session only after an owner requests pairing, accepts country-code-normalized digits-only numbers, and handles pairing, connection state, logout, basic commands, and controlled automations. Raw auth files are held temporarily on the server, encrypted before a snapshot is sent to server-side object storage, and referenced by an opaque key; the dashboard database never receives the raw session material or pairing code.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Platform-provided | Persistent dashboard data. |
| `JWT_SECRET` | Platform-provided | Secure application sessions. |
| `NEP_LLM_API_KEY` | Only for AI | Provider API key. Keep this server-side only. |
| `NEP_LLM_BASE_URL` | Only for AI | LLM-compatible API base URL. |
| `NEP_LLM_MODEL` | Only for AI | Selected model identifier. |

Do not add these values to a client file, repository, or chat message. Add project secrets through the secure deployment settings. Leave AI auto-reply disabled until all three LLM variables are configured and the provider has been tested.

## First-party connector lifecycle

The connector uses the linked-device pairing code method. After a validated profile is selected, NEP BOT starts a server-side socket, waits for it to become pairing-ready, then requests a temporary eight-digit code. The owner must complete the confirmation on their phone. The connector updates the profile to `connected` only after the linked-device socket reports a successful connection.

The first-party command adapter supports `/hi`, `/roast`, `/menu`, `/joke`, `/meme`, `/translate`, `/media`, `/ai`, `/public`, `/private`, `/antilink on|off`, and `/group`. Commands and automations respect the owner/public mode and the saved feature switches. Media delivery remains disabled until an approved provider is configured; NEP BOT does not fetch untrusted media links by default.

## Linked-device setup

Create a profile by choosing a country and entering a national number. The server validates the normalized E.164 number before it persists the profile. Select the profile, request a temporary code, then use WhatsApp on the owner’s phone:

> **WhatsApp → Settings → Linked Devices → Link a device → Link with phone number**

The owner must enter the code and complete the confirmation. The dashboard cannot approve this action on the owner’s behalf.

## Local development

Install the JavaScript and Python requirements, then start the project:

```bash
pnpm install
sudo pip3 install -r python_service/requirements.txt
pnpm dev
```

Run checks before delivery:

```bash
pnpm test
pnpm check
pnpm build
```

## Production deployment

The root `Dockerfile` adds Python 3 and installs `python_service/requirements.txt` alongside the normal Node build. The web application can deploy through the standard project publishing flow after a checkpoint is created.

For a real linked-device session, select an always-on single-instance runtime rather than relying on a stateless request-only deployment. A stateless deployment can serve the dashboard but may pause, restart, or lose the in-memory socket between requests. Always-on hosting keeps the first-party connector process available for pairing, live status, and ongoing command handling.
