# Unicell SMS Connector

Unicell (Soprano) SMS connector using the REST API with credentials in the JSON body.

## Config

| Field      | Type     | Required | Description              |
|------------|----------|----------|--------------------------|
| `username` | `string` | Yes      | Unicell API username     |
| `password` | `string` | Yes      | Unicell API password     |
| `from`     | `string` | Yes      | Default sender name      |

## Features

### Message Structure

The connector sends a PascalCase JSON body with `UserName`, `Password`, `SenderName`, `BodyMessage`, and `Recipients` array. Each recipient has a `Cellphone` field.

### Error Handling

The API returns `StatusCode: 0` for success. Non-zero `StatusCode` values are treated as errors and throw `ConnectorError` with the `StatusDescription`.

### Passthrough

Use `_passthrough.body` to add Unicell-specific fields to the request body.

## API

- **Endpoint:** `POST https://restapi.soprano.co.il/api/Sms`
- **Auth:** Credentials in JSON body (`UserName`, `Password`)
- **Provider ID:** `unicell` (matches `SmsProviderIdEnum.Unicell`)
- **API Reference:** [POST api/Sms](https://restapi.soprano.co.il/Help/Api/POST-api-Sms)
