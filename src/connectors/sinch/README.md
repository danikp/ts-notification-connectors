# Sinch SMS Connector

Sinch SMS connector using the Batches API with Bearer token authentication.

## Config

| Field           | Type     | Required | Description                                    |
|-----------------|----------|----------|------------------------------------------------|
| `servicePlanId` | `string` | Yes      | Sinch Service Plan ID                          |
| `apiToken`      | `string` | Yes      | Sinch API token                                |
| `from`          | `string` | Yes      | Default sender phone number                    |
| `region`        | `string` | No       | API region (`us`, `eu`, etc.). Defaults to `us` |

## Features

### Recipient Format

The `to` field is sent as an array to the Sinch Batches API, even for single recipients.

### Regional Endpoints

The connector builds the URL using the configured `region` (defaults to `us`): `https://{region}.sms.api.sinch.com/xms/v1/{servicePlanId}/batches`.

### Passthrough

Use `_passthrough.body` to add Sinch-specific fields like `delivery_report` or `send_at`.

## API

- **Endpoint:** `POST https://{region}.sms.api.sinch.com/xms/v1/{servicePlanId}/batches`
- **Auth:** Bearer token
- **Provider ID:** `sinch` (matches `SmsProviderIdEnum.Sinch`)
- **API Reference:** [Sinch SMS Batches API](https://developers.sinch.com/docs/sms/api-reference/batches/send-sms/)
