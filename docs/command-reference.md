# NEP BOT Command Reference

NEP BOT accepts both slash and dot command syntax. For example, `/ping` and `.ping` are equivalent. Commands marked **Owner** run only when issued by the paired owner account. Public commands respond only while the profile is in public mode.

| Category | Commands | Access | Purpose |
|---|---|---|---|
| Essentials | `/hi`, `/menu`, `/help`, `/commands`, `/ping`, `/status`, `/about` | Public | Greeting, command directory, and listener or connection feedback. |
| Fun and interaction | `/joke`, `/roast [name]`, `/quote`, `/fact`, `/dice`, `/flip`, `/8ball [question]`, `/choose a \| b`, `/echo [text]` | Public | Safe text-only responses and small interactions. |
| Information | `/time`, `/date`, `/version`, `/privacy`, `/support`, `/rules`, `/id` | Public | General bot information, privacy guidance, and chat identifier feedback. |
| Provider guidance | `/meme`, `/translate [text]` | Public | Explain approved-provider requirements; no untrusted content is fetched automatically. |
| Command visibility | `/public`, `/unlock`, `/private`, `/lock`, `/mode` | Owner | Switch public or owner-only handling and inspect current mode. |
| Moderation | `/antilink on|off`, `/anticall on|off`, `/groupmode on|off` | Owner | Set approved group link control, incoming-call handling, and group utility access. |
| Automation | `/autoread on|off`, `/autoreact on|off`, `/autoreply on|off` | Owner | Control safe automation features. AI auto-reply also requires a configured provider. |
| Owner diagnostics | `/features`, `/automations`, `/settings`, `/diagnostics`, `/profile`, `/activity`, `/uptime` | Owner | Review enabled features, connector state, and owner dashboard guidance. |
| Session controls | `/reconnect`, `/disconnect` | Owner | Direct the owner to the secure dashboard session controls. |
| Provider-backed | `/ai [prompt]`, `/media [url]` | Owner | Use only with an approved configured provider; the server never exposes provider credentials. |

> **Safety note:** NEP BOT deliberately does not include unsolicited bulk messaging, mass forwarding, or hidden monitoring features. Owner controls are scoped to the linked profile and logged only as non-sensitive activity.
