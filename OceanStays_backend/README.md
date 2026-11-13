# Ocean Stays API (Flask + PostgreSQL)

Setup is in the [root README](../README.md). This file describes how the API works.

## Layout

| File | Purpose |
|---|---|
| `app.py` | Creates the app, registers blueprints, `/health` |
| `config.py` | Reads `.env` |
| `db.py` | Connection pool, `query()` / `query_one()` / `transaction()` helpers (rows as dicts) |
| `auth.py` | JWT login tokens, `@require_roles(...)` |
| `mappings.py` | **The only place** database spellings are translated to the frontend's enums |
| `serializers.py` | SQL for bookings / requests / tasks / users and the JSON shapes the pages read |
| `services.py` | Shared rules: hotel-local "today", room availability, pricing, audit log, notifications |
| `routes/*.py` | Endpoints, one module per area |
| `migrations/*.sql` | Schema changes, applied in order by `python migrate.py` (which also hashes any plain-text passwords) |
| `passwords.py` | Password hashing (werkzeug scrypt); plain text is never accepted at sign-in |
| `scripts/hash_passwords.py` | Hash plain-text passwords on their own (`--check` to count only) |

## Conventions

- **Auth:** `POST /login` returns `{token, user}`. Send `Authorization: Bearer <token>`
  (valid 12 hours). No token → `401`; wrong role → `403`.
- **IDs:** the frontend always sends and receives **user ids** (`guestId`, `staffId`,
  `assignedToId`). The API converts to `guest.guest_id` / `staff.staff_id` itself. Guests
  only ever see their own data, whatever ids they send.
- **Values:** statuses use the frontend enums (`CHECKED_IN`, `IN_PROGRESS`, `MAINTENANCE`,
  `NORMAL`, …); `mappings.py` converts to and from the database spellings.
- **JSON:** dates `"2026-11-13"`, times `"14:00"`, money as numbers, errors as `{"message": "..."}`.
- **Side effects:** every create/update/status/payment writes `audit_log`; guests get a
  `notification` for booking, payment and request changes. These are written on a
  background thread (`ASYNC_SIDE_EFFECTS=0` writes them inline).
- **Payments are simulated:** `/payments/intent` returns `clientSecret: "sim_…"`;
  confirming with that token succeeds, anything else is declined (`402`).
- **Password reset:** no mail server is configured, so the reset link is printed in the
  backend console.

## Room turnaround

```
booked ──► check-in: room Occupied ──► check-out: room Dirty + "Departure Clean" task
Dirty ──task started──► Cleaning ──task done──► Clean ──inspection passed──► Inspected (sellable)
                                                     └─inspection failed──► Dirty + new task
maintenance reported ──► Maintaining ──repair completed──► Clean (back to inspection)
```

## Endpoints

Roles: **P** public · **G** guest · **R** receptionist · **H** housekeeping · **S** service staff · **A** admin · **any** = any signed-in user.

| Method & path | Who | What |
|---|---|---|
| `GET /health` | P | Database reachable? |
| `POST /login` | P | Email (or username) + password → `{token, user}` |
| `POST /auth/register` | P | New guest account → `{token, user}`; `409` if the email exists |
| `POST /auth/forgot-password` | P | Always `200`; prints a 1-hour reset link to the console |
| `POST /auth/reset-password` | P | `{token, password}`; `400` used/invalid, `410` expired |
| `POST /auth/logout` · `GET /auth/me` | any | Audit the logout · current profile |
| `GET /rooms` | P | Rooms as rows `[id, number, typeId, status, floor, notes]`; `?status=` |
| `GET /rooms/<id>` · `PATCH /rooms/<id>` | R H A | One room · change status/notes (allowed statuses depend on role) |
| `GET /roomtypes` | P | Room categories as rows `[id, name, description, capacity, price, bed, size, rating, reviews, amenities, family, familyId]` |
| `GET /roomfacilities` | P | Amenities per category |
| `GET /rooms/availability` | P | `?checkIn&checkOut&guests` → free rooms per category |
| `GET /bookings` | R A | Search/paginate: `status, search, guestId, date, page, pageSize` |
| `POST /bookings` | G R A | Book a category for dates; picks a free room; `409` when sold out |
| `GET /bookings/<id>` · `PATCH /bookings/<id>` | owner R A | Details · change dates/guests (guests: before the modification cut-off) |
| `POST /bookings/<id>/confirm` | owner R A | Pending → Confirmed ("pay on arrival") |
| `POST /bookings/<id>/cancel` | owner R A | Refunds paid amounts inside the free-cancellation window; guests can't cancel after it |
| `POST /bookings/<id>/check-in` | R A | `{roomId?}`; room → Occupied |
| `POST /bookings/<id>/check-out` | R A | Balance must be settled; room → Dirty, creates the cleaning task |
| `GET /bookings/<id>/invoice` | owner R A | Invoice lines for the booking |
| `GET /bookings/guest/<userId>` | owner R A | `{current, upcoming, past}` |
| `GET /bookings/front-desk` | R A | `{arrivals, departures, inHouse, unpaid}` for today |
| `GET /payments` | G R A | Invoices; guests see their own; `?guestId&status&bookingId` |
| `POST /payments/intent` | owner R A | `{bookingId, method: card|bank|cash}` → `{intentId, clientSecret, amount}` (amount = balance due) |
| `POST /payments/confirm` | owner R A | `{intentId, bookingId, providerToken}` → `{receiptReference, invoice, booking}` |
| `GET /payments/invoices/<id>` | owner R A | One invoice |
| `GET /service-requests` | any | Guests: their own. Filters `type, status, assignedToId, guestId, bookingId, page, pageSize` |
| `GET /service-requests/summary` | any | Counts per status (same filters) |
| `POST /service-requests` | G staff | Guests need a checked-in stay (`400` otherwise); staff give `roomId`/`roomNumber` |
| `GET /service-requests/<id>` | owner staff | One request |
| `PATCH /service-requests/<id>/status` | staff (guest: cancel own) | Only allowed moves (`409` otherwise) |
| `POST /service-requests/<id>/assign` | R H S A | `{staffId: userId}` (defaults to yourself) |
| `GET /housekeeping/summary` · `GET /housekeeping/tasks[/<id>]` | H R A | `?assignedToId` = theirs + unassigned; `?status&floor` |
| `PATCH /housekeeping/tasks/<id>/status` | H A | Keeps the room status in step |
| `POST /housekeeping/rooms/<id>/inspect` | H A | `{passed, note}`; room must be Clean |
| `POST /housekeeping/maintenance` | H R S A | `{roomId, title, details, priority}` → `{reference}`; room → Maintaining |
| `GET /users` | R A | Reception sees guests only; `?role=` |
| `GET /users/<id>` · `PATCH /users/<id>` | self A (R: guests) | Profile; admins may also change `role` |
| `PATCH /users/<id>/status` | A | `ACTIVE / INACTIVE / SUSPENDED` (not yourself) |
| `GET /staff` | staff | Staff with `employment_status` |
| `GET /guests`, `/reservations`, `/reservationrooms` | R A | Older raw lists, kept for compatibility |
| `GET /feedback` · `POST /feedback` | G R A · G | One review per stay (checked in or out); `409` on a second |
| `GET /notifications` | any | Own; admins see everyone's without `userId` |
| `GET /notifications/unread-count` · `POST /notifications/<id>/read` · `POST /notifications/read-all` | any | |
| `GET /facilities` | P | Facilities |
| `POST /content/facilities` · `PATCH /content/facilities/<id>` | A | Create / edit (unique name) |
| `GET /content/experiences`, `/testimonials`, `/gallery?category=`, `/highlights`, `/hotel` | P | Public website content |
| `POST /content/contact` | P | Saves to `contact_message` → `{reference}` |
| `GET /admin/stats` · `GET /admin/trends` | A | Dashboard figures, 6-month trends |
| `GET /admin/audit-logs` · `GET /admin/audit-logs/actors` | A | `page, pageSize, search, action, module, result, actorId, from, to` |
| `GET /admin/settings` · `PATCH /admin/settings/<hotel|operations|notifications>` | A | Hotel details, booking policy, notification switches |
| `GET /roles` · `GET /roles/<id>/permissions` · `PUT /roles/<id>/permissions` | A | Permission matrix (Administrator is locked) |

## Database changes (`migrations/`)

| File | Change |
|---|---|
| `001_room_status.sql` | `room.status` also allows `Occupied`, `Cleaning`, `Clean` |
| `002_service_request_room.sql` | `service_request.room_id`; a request needs a room **or** a stay |
| `003_password_reset_token.sql` | `password_reset_token` table (hashed tokens) |
| `004_content.sql` | `contact_message` table; `facility.icon/capacity`; `feedback.category` |
| `005_notification_setting.sql` | `notification_setting` (the admin's notification switches) |
| `006_indexes.sql` | Indexes for the common lookups |

To change the schema, add `007_description.sql` and run `python migrate.py`; never edit a
file that has already been applied (the runner warns if one changes).

## Tests

```bash
docker run -d --name oceanstays-testdb -e POSTGRES_PASSWORD=testpass -e POSTGRES_DB=oceanstays_test \
    -p 127.0.0.1:55432:5432 postgres:18
docker exec -i oceanstays-testdb pg_restore --no-owner --no-privileges -U postgres -d oceanstays_test < OceanStays.backup
DATABASE_URL=postgresql://postgres:testpass@127.0.0.1:55432/oceanstays_test JWT_SECRET=x python migrate.py
docker exec oceanstays-testdb psql -U postgres -c "CREATE DATABASE oceanstays_template TEMPLATE oceanstays_test"
python -m pytest tests -q
```

Each run clones `oceanstays_template`, so tests never touch Neon and always start from the
same data. `tests/test_stay_story.py` walks one stay from booking to feedback.
