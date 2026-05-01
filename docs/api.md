# API reference

Base URL: `http://localhost:8080/v1`. Interactive Swagger UI: `/docs`.

## Authentication

All routes except `/auth/signup`, `/auth/token`, and `/mail-servers/verify`
require a Bearer token.

### POST `/auth/signup`

```json
{
  "username": "alice",
  "email": "alice@example.com",
  "password": "hunter22",
  "fullname": "Alice Example",
  "accessCode": "admin"
}
```

→ `201` returns the created user.

### POST `/auth/token`

OAuth2 password form (`application/x-www-form-urlencoded`):

```
username=alice&password=hunter22
```

→ `200` returns `{ accessToken, tokenType, userId }`.

### GET `/auth/me`

Returns the authenticated user's profile.

## Mail servers

| Method | Path                       | Notes                                |
| ------ | -------------------------- | ------------------------------------ |
| POST   | `/mail-servers`            | Create                               |
| GET    | `/mail-servers`            | List (own)                           |
| PUT    | `/mail-servers/{id}`       | Update                               |
| POST   | `/mail-servers/delete`     | Bulk delete (`{ ids: [] }`)          |
| POST   | `/mail-servers/verify`     | Probe SMTP credentials (no auth)     |

## Email lists

| Method | Path                    | Notes                                                            |
| ------ | ----------------------- | ---------------------------------------------------------------- |
| POST   | `/email-lists`          | `multipart/form-data`: `name`, `listType`, `file` (CSV)          |
| GET    | `/email-lists`          | Paginated. Filter by `listType`.                                 |
| PUT    | `/email-lists/{id}`     | Replace or merge a CSV upload                                    |
| POST   | `/email-lists/delete`   | Bulk delete                                                      |

CSV format: required column `email`. Reply lists also require `password`.

## Warmups

| Method | Path                  | Notes                                          |
| ------ | --------------------- | ---------------------------------------------- |
| POST   | `/warmups`            | Create + schedule                              |
| GET    | `/warmups`            | Paginated. Filter by `state`.                  |
| GET    | `/warmups/{id}`       | Detail                                         |
| POST   | `/warmups/state`      | Bulk pause/resume (`{ ids, action }`)          |
| POST   | `/warmups/delete`     | Bulk delete + cancels jobs and warmup-days     |

## Errors

Errors are returned as:

```json
{ "message": "Short title", "description": "Longer human-readable explanation" }
```

Validation errors return `422` with `details` containing the Pydantic errors.
