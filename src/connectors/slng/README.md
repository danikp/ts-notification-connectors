# SLNG SMS Connector

SLNG SMS connector using the SendSmsJsonBody API with credentials in a URL-encoded JSON body.

## Config

| Field      | Type     | Required | Description              |
|------------|----------|----------|--------------------------|
| `username` | `string` | Yes      | SLNG API username        |
| `password` | `string` | Yes      | SLNG API password        |
| `from`     | `string` | Yes      | Default sender number    |

## Features

### Message Structure

The connector builds a PascalCase JSON payload with `Username`, `Password`, `MsgName`, `MsgBody`, `FromMobile`, and `Mobiles` array. The JSON is URL-encoded and sent as `application/x-www-form-urlencoded`.

### Error Handling

The API returns `Status: true` for success. When `Status` is `false`, the connector throws `ConnectorError` with the `Description` field.

### Passthrough

Use `_passthrough.body` to add SLNG-specific fields to the JSON payload before it is URL-encoded.

## API

- **Endpoint:** `POST https://slng5.com/Api/SendSmsJsonBody.ashx`
- **Auth:** Credentials in JSON body (`Username`, `Password`)
- **Provider ID:** `slng` (matches `SmsProviderIdEnum.SLNG`)
