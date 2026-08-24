# Technical References

## Baileys linked-device pairing

The first-party connector follows the Baileys pairing-code guide: create a socket, wait for the pairing-ready event, call `requestPairingCode` only for an unregistered auth state, and pass a country-code-prefixed digits-only number. The owner completes the link on their phone, after which the connector receives a `connection: "open"` update.

Source: [Baileys — Pairing code](https://baileys.wiki/authentication/pairing-code)

The guide also notes that this is a WhatsApp Web linked-device method rather than the Mobile API, and that persistent sessions require saved authentication state.
