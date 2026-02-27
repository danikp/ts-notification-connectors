# Vonage SMS Connector

Vonage (Nexmo) SMS connector using the REST API with API key/secret authentication.

## Config

| Field       | Type     | Required | Description                 |
|-------------|----------|----------|-----------------------------|
| `apiKey`    | `string` | Yes      | Vonage API key              |
| `apiSecret` | `string` | Yes      | Vonage API secret           |
| `from`      | `string` | Yes      | Default sender phone number |

## Quirks

### HTTP 200 Errors

Vonage returns HTTP 200 even on errors. The connector checks `messages[0].status === '0'` and throws `ConnectorError` with the Vonage status code and `error-text` for non-zero statuses.

### Passthrough

Use `_passthrough.body` to add fields like `callback` or `client-ref` to the form-encoded request body.

## API

- **Endpoint:** `POST https://rest.nexmo.com/sms/json`
- **Auth:** `api_key` + `api_secret` in request body
- **Format:** `application/x-www-form-urlencoded`
- **Provider ID:** `nexmo` (matches `SmsProviderIdEnum.Nexmo`)
