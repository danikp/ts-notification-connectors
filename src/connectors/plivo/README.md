# Plivo SMS Connector

Plivo SMS connector using the Messages API with HTTP Basic authentication.

## Config

| Field       | Type     | Required | Description           |
|-------------|----------|----------|-----------------------|
| `authId`    | `string` | Yes      | Plivo Auth ID         |
| `authToken` | `string` | Yes      | Plivo Auth Token      |
| `from`      | `string` | Yes      | Default sender number |

## Features

### Phone Number Format

Plivo accepts numbers with or without the `+` prefix (e.g., `14155551234` or `+14155551234`).

### Response

Plivo returns a `message_uuid` array. The connector extracts the first UUID as the message ID.

### Passthrough

Use `_passthrough.body` to add Plivo-specific fields like `url` (callback), `method`, or `log`.

## Quirks

- **Trailing slash required** in the API URL (`/Message/`). The connector handles this.
- **HTTP 202** on success (not 200).

## API

- **Endpoint:** `POST https://api.plivo.com/v1/Account/{authId}/Message/`
- **Auth:** HTTP Basic (`AuthID:AuthToken`)
- **Format:** JSON
- **Provider ID:** `plivo` (matches `SmsProviderIdEnum.Plivo`)
