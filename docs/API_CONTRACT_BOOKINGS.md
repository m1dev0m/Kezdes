# Bookings API Contract (MVP)

## Create Reservation
- Endpoint: `POST /api/v1/bookings/`
- Auth: required (`customer`/`organizer`)
- Required payload fields:
  - `restaurant` (id)
  - `date` (`YYYY-MM-DD`)
  - `time` (`HH:MM[:SS]`)
  - `guests` (>=1)
- Optional:
  - `duration_minutes` (default 90)
  - `event_type`
  - `special_requests`
  - `Idempotency-Key` header

## Idempotency
- Header: `Idempotency-Key: <key>`
- Same key + same payload:
  - returns existing booking (`200`)
- Same key + different payload:
  - returns `409` with error envelope

## Status Mapping
- Internal:
  - `pending`, `approved`, `rejected`, `cancelled_by_user`, `cancelled_by_restaurant`, `completed`, `no_show`
- Public aliases in responses:
  - `approved` -> `confirmed`
  - `cancelled_by_*` -> `cancelled`

## Reservation Alias Fields
Response includes compatibility aliases:
- `reservation_date` (same as `date`)
- `reservation_time` (same as `time`)
- `customer_id`
- `table_id`

## Delete Reservation
- Endpoint: `DELETE /api/v1/bookings/:id/`
- Behavior:
  - no hard delete
  - converts booking to `cancelled_by_user`
  - returns `204`

## Error Envelope (standard)
```
{
  "success": false,
  "error": {
    "message": "...",
    "details": { ... },
    "status_code": 400
  }
}
```
