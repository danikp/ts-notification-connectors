# Pushover Push Connector

Pushover push connector using application token authentication with form-encoded requests.

## Config

| Field   | Type     | Required | Description                  |
|---------|----------|----------|------------------------------|
| `token` | `string` | Yes      | Pushover application API token |

## Features

### Multi-Token Delivery

Pushover addresses messages to individual user keys. The connector sends one HTTP call per target user key using `Promise.allSettled()`. Partial failures return error messages in the `ids` array instead of throwing.

### Sound Override

Pass `overrides.sound` to set a custom notification sound on the Pushover message.

### Passthrough

Use `_passthrough.body` to add Pushover-specific fields like `priority`, `url`, `url_title`, `device`, `html`, or `expire`/`retry` for emergency-priority messages.

## API

- **Endpoint:** `POST https://api.pushover.net/1/messages.json`
- **Auth:** Application token sent in request body
- **Format:** `application/x-www-form-urlencoded`
- **Provider ID:** `pushover` (matches `PushProviderIdEnum.PUSHOVER`)
- **API Reference:** [Pushover Message API](https://pushover.net/api)
