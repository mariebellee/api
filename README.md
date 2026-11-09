# Notes REST API

A RESTful API built with **Node.js**, **Express** and **MongoDB (Mongoose)**.
The primary resource is a **note** with full CRUD, validation and persistent storage.

## Setup

1. Install dependencies
   ```
   npm install
   ```
2. Create a free cluster on MongoDB Atlas, add a database user, allow your IP under Network Access, and copy the connection string.
3. Copy `.env.example` to `.env` and fill in your values
   ```
   MONGODB_URI=mongodb+srv://USER:PASSWORD@YOUR-CLUSTER.mongodb.net/notes
   PORT=3000
   ```
   `.env` is listed in `.gitignore` and is never committed.
4. Start the server
   ```
   npm run dev
   ```
   You should see `connected to MongoDB` and `Listening on http://localhost:3000`.

## The note model

| Field | Type | Rules |
|---|---|---|
| `title` | String | required, trimmed, max 120 characters |
| `body` | String | optional, defaults to `""` |
| `tags` | [String] | optional, defaults to `[]` |
| `_id` | ObjectId | set by MongoDB |
| `createdAt`, `updatedAt` | Date | set by the server |

## Routes

| Job | Method | Path | Success | Can fail |
|---|---|---|---|---|
| List all | GET | `/api/notes` | 200 | 500 |
| Get one | GET | `/api/notes/:id` | 200 | 400, 404 |
| Create | POST | `/api/notes` | 201 | 400 |
| Replace | PUT | `/api/notes/:id` | 200 | 400, 404 |
| Update | PATCH | `/api/notes/:id` | 200 | 400, 404 |
| Delete | DELETE | `/api/notes/:id` | 204 | 400, 404 |

Any other path returns `404 {"error":"Not found"}`.

### GET /api/notes
Optional query `?search=exam` filters by title (case-insensitive). Newest first.

```
curl "localhost:3000/api/notes?search=exam"
```
Response `200`:
```json
[
  {
    "_id": "66f1c2e4b7a1d3f0c8e2a9b1",
    "title": "Exam topics",
    "body": "Hooks, Express, REST",
    "tags": ["exam", "week9"],
    "createdAt": "2026-10-25T14:02:11.000Z",
    "updatedAt": "2026-10-25T14:02:11.000Z",
    "__v": 0
  }
]
```

### GET /api/notes/:id
```
curl localhost:3000/api/notes/66f1c2e4b7a1d3f0c8e2a9b1
```
- `200` the note
- `400` `{"error":"Invalid id"}`
- `404` `{"error":"Note not found"}`

### POST /api/notes
```
curl -i -X POST localhost:3000/api/notes \
  -H "Content-Type: application/json" \
  -d '{"title":"Exam topics","body":"Hooks, Express, REST","tags":["exam","week9"]}'
```
- `201` the created note (same shape as above)
- `400` `{"error":"title is required"}` when the title is missing or empty
- `400` a validation message when a schema rule fails (e.g. title over 120 characters)

### PUT /api/notes/:id
Replaces the whole note. Fields you leave out go back to their defaults.
```
curl -X PUT localhost:3000/api/notes/66f1c2e4b7a1d3f0c8e2a9b1 \
  -H "Content-Type: application/json" \
  -d '{"title":"Exam topics v2","body":"Add CORS","tags":["exam"]}'
```
- `200` the updated note
- `400` invalid id, missing title, or failed validation
- `404` `{"error":"Note not found"}`

### PATCH /api/notes/:id
Changes only the fields you send.
```
curl -X PATCH localhost:3000/api/notes/66f1c2e4b7a1d3f0c8e2a9b1 \
  -H "Content-Type: application/json" \
  -d '{"body":"Only the body changes"}'
```
- `200` the updated note
- `400` invalid id or failed validation (e.g. empty title)
- `404` `{"error":"Note not found"}`

### DELETE /api/notes/:id
```
curl -i -X DELETE localhost:3000/api/notes/66f1c2e4b7a1d3f0c8e2a9b1
```
- `204` no body
- `400` invalid id
- `404` `{"error":"Note not found"}` (also what you get if you delete the same note twice)

## Error handling

- Invalid id format → `400`, missing record → `404`, bad data → `400`, unexpected failure → `500 {"error":"Server error"}`.
- Every database call is in `try/catch`, so a bad request does not crash the server.
- Malformed JSON in the request body is rejected by Express with a 400 and the server keeps running.

## Test evidence (curl)

Run these in order with the server running. Replace `<ID>` with the `_id` returned by step 2.

```
# 1. List (empty at first)
curl -i localhost:3000/api/notes                                  # 200 []

# 2. Create
curl -i -X POST localhost:3000/api/notes -H "Content-Type: application/json" \
  -d '{"title":"Exam topics","tags":["exam"]}'                     # 201

# 3. Create with no title
curl -i -X POST localhost:3000/api/notes -H "Content-Type: application/json" \
  -d '{"body":"no title"}'                                         # 400

# 4. Get one / bad id / missing id
curl -i localhost:3000/api/notes/<ID>                              # 200
curl -i localhost:3000/api/notes/abc                               # 400
curl -i localhost:3000/api/notes/000000000000000000000000          # 404

# 5. Search
curl -i "localhost:3000/api/notes?search=exam"                     # 200

# 6. Replace and update
curl -i -X PUT localhost:3000/api/notes/<ID> -H "Content-Type: application/json" \
  -d '{"title":"Exam topics v2"}'                                  # 200
curl -i -X PATCH localhost:3000/api/notes/<ID> -H "Content-Type: application/json" \
  -d '{"body":"Added a body"}'                                     # 200
curl -i -X PATCH localhost:3000/api/notes/<ID> -H "Content-Type: application/json" \
  -d '{"title":""}'                                                # 400

# 7. Persistence: Ctrl+C, run npm run dev again, then
curl -i localhost:3000/api/notes/<ID>                              # 200, still there

# 8. Delete, then delete again
curl -i -X DELETE localhost:3000/api/notes/<ID>                    # 204
curl -i -X DELETE localhost:3000/api/notes/<ID>                    # 404

# 9. Unknown route
curl -i localhost:3000/api/nothing                                 # 404
```
