# NEP BOT

NEP BOT is an owner-controlled WhatsApp onboarding and management dashboard. It validates phone numbers using country-aware E.164 rules, persists non-sensitive bot configuration, guides linked-device pairing, and presents a clear command, activity, and moderation-control workspace.

> **Important:** The dashboard is designed to control a separate WhatsApp connector. It does not store session credentials or pairing codes. A linked-device connector must remain online independently of the web dashboard.

## What is included

| Area | Included behavior |
| --- | --- |
| Dashboard | Responsive overview, bot profiles, guided setup, activity, command catalog, and owner controls. |
| Number validation | National-number formatting in the browser plus strict server-side validation and E.164 normalization in Python. |
| Pairing | A verified profile can request a short-lived pairing code from a configured connector. Codes are returned only to the current owner session and are never written to the database. |
| Persistence | Bot profile settings, country-normalized setup data, feature switches, public/private mode, command preferences, and non-sensitive activity. |
| Controls | Owner-scoped public/private mode, anti-link, anti-call, auto-read, auto-react, group controls, and AI auto-reply preference. |
| Safety | No bulk-messaging workflow, no session exports, strict input lengths, per-owner profile checks, and server-side secret handling. |

## Runtime architecture

The website runs as a Node/React application. The Node server invokes `python_service/nep_bot_service.py` for phone validation and connector orchestration. The Python service uses `phonenumbers` to confirm that a selected country, calling code, and national number resolve to a valid E.164 number.

The WhatsApp connector itself is intentionally separate. A linked-device session is a long-lived connection, whereas the dashboard is designed for ordinary request/response work. Run the connector as a single-owner always-on service, keep its credentials in its own secret store, and connect it to this dashboard through the contract below.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Platform-provided | Persistent dashboard data. |
| `JWT_SECRET` | Platform-provided | Secure application sessions. |
| `NEP_CONNECTOR_URL` | For real pairing | HTTPS base URL of the always-on WhatsApp connector, without a trailing slash. |
| `NEP_CONNECTOR_TOKEN` | Recommended | Shared bearer token used only server-to-server between NEP BOT and the connector. |
| `NEP_LLM_API_KEY` | Only for AI | Provider API key. Keep this server-side only. |
| `NEP_LLM_BASE_URL` | Only for AI | LLM-compatible API base URL. |
| `NEP_LLM_MODEL` | Only for AI | Selected model identifier. |

Do not add these values to a client file, repository, or chat message. Add project secrets through the secure deployment settings. Leave AI auto-reply disabled until all three LLM variables are configured and the provider has been tested.

## Connector contract

NEP BOT calls the connector from the Python service over HTTPS. The connector should verify the bearer token, rate-limit requests, and keep all session credentials private.

### Request a pairing code

`POST {NEP_CONNECTOR_URL}/connector/request_pairing`

```json
{
  "action": "request_pairing",
  "phoneE164": "+9779841234567"
}
```

The connector returns the temporary code without persisting it in the dashboard:

```json
{
  "pairingCode": "ABCD-1234"
}
```

### Disconnect a session

`POST {NEP_CONNECTOR_URL}/connector/disconnect`

```json
{
  "action": "disconnect",
  "phoneE164": "+9779841234567"
}
```

A successful response can be an empty JSON object or a status object. The dashboard marks a profile disconnected only after the connector confirms the action.

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

For a real linked-device connector, select an always-on single-instance runtime rather than relying on a stateless request-only deployment. The connector should be deployed separately from the dashboard unless both workloads are deliberately managed in one persistent service.
