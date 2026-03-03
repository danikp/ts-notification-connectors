# Cellact SMS Connector

Cellact SMS connector using the GlobalAPI with PALO XML request format.

## Config

| Field      | Type     | Required | Description              |
|------------|----------|----------|--------------------------|
| `username` | `string` | Yes      | Cellact API username     |
| `password` | `string` | Yes      | Cellact API password     |
| `from`     | `string` | Yes      | Default sender name      |

## Features

### Message Structure

The connector builds a PALO XML body with `<HEAD>` (containing `<FROM>`, `<APP>` with credentials as attributes, and `<CMD>sendtextmt</CMD>`) and `<BODY>` (containing `<CONTENT>` and `<DEST_LIST>`). The XML is URL-encoded and sent as `xmlString=<encoded-xml>` with `application/x-www-form-urlencoded`.

### XML Escaping

All user-provided content (message text, sender name, phone number, credentials) is XML-escaped to prevent injection.

### Error Handling

The API returns XML with `<RESULTCODE>0</RESULTCODE>` for success. Non-`0` result codes are treated as errors. The message ID is extracted from the `<BLMJ>` element in the response.

### Passthrough

Use `_passthrough.headers` to add custom headers to the request.

## API

- **Endpoint:** `POST https://cellactpro.net/GlobalSms/ExternalClient/GlobalAPI.asp`
- **Auth:** Credentials as XML attributes on `<APP>` element (`USER`, `PASSWORD`)
- **Provider ID:** `cellact` (matches `SmsProviderIdEnum.Cellact`)
