# Ocean Stays — Frontend

> Where the Ocean Meets Exceptional Hospitality.

React frontend for the Ocean Stays Smart Hotel Management System: a public hotel
website plus role-based operational dashboards for reception, housekeeping,
service staff and administration.

This repository is **frontend only**. The REST API is built separately in
NestJS + MongoDB.

## Stack

React 19 · Vite 8 · React Router 7 · Bootstrap 5 (CSS only) · Bootstrap Icons ·
custom CSS

Bootstrap's JavaScript bundle is deliberately **not** loaded. Menus, modals and
drawers are controlled React components, which keeps focus management and ARIA
under our control and stops the UI looking like a stock Bootstrap template.

## Getting started

```bash
npm install
npm run dev      # dev server
npm run build    # production build
npm run lint     # eslint — must pass clean
```

Copy `.env.example` to `.env` to point the app at a real API.

### Demo accounts

While `VITE_USE_MOCK_AUTH` is on, these addresses sign in as real fixture users,
so the dashboards have bookings, requests and invoices behind them. **Any
password of 8 or more characters is accepted.**

| Email | Role |
|---|---|
| `amara.perera@example.com` | Guest |
| `reception@oceanstays.com` | Receptionist |
| `housekeeping@oceanstays.com` | Housekeeping |
| `service@oceanstays.com` | Service staff |
| `admin@oceanstays.com` | Administrator |

Any other address signs in with a role derived from its local part and no data
behind it — which is what a genuinely new sign-up looks like. The login page
shows this list too; delete `DemoAccounts` in `pages/auth/Login.jsx` and the
`.shms-demo-note` block in `styles/login.css` before a real deployment.

## Architecture

```
src/
├── components/
│   ├── booking/    Booking flow steps
│   ├── common/     Reusable UI (Modal, Toast, StatusBadge, RoomCard, …)
│   ├── layout/     Public and dashboard shells
│   └── public/     Home and listing page sections
├── context/        AuthProvider (signed-in user), ToastProvider (feedback)
├── hooks/          useAuth, useToast, useAsync
├── pages/
│   ├── auth/       Login, Register, Forgot/Reset password
│   ├── booking/    The booking wizard
│   ├── guest/      Guest portal
│   └── public/     Public website pages
├── services/       API layer — one module per domain
│   └── mock/       Fixtures used while the backend is being built
├── styles/         tokens → base → forms → per-page
└── utils/          Formatting, status mapping, validation
```

### Auth state

`AuthProvider` holds the signed-in user; components read it through `useAuth()`.
Nothing outside `services/authService.js` touches session storage directly, so
signing in or out re-renders the navbar, route guards and dashboards together.

The context is split across three files — `context/authContext.js` (the
context object), `context/AuthProvider.jsx` (the component) and
`hooks/useAuth.js` (the hook) — because React Fast Refresh requires a module
that exports a component to export nothing else.

### Design system

Stylesheets are layered, and each one may only depend on the layer above it:

| File | Contains |
|---|---|
| `styles/tokens.css` | Every colour, font, space, radius, shadow and duration as a `:root` custom property |
| `styles/base.css` | Buttons, cards, badges, sections, skeletons, empty/error states |
| `styles/forms.css` | Inputs, labels, validation messages, the submit button |
| `styles/*.css` | Page- and component-specific rules only |

No component hardcodes a colour or a radius. Status colours resolve through
`utils/status.js`, so a booking status renders identically everywhere.

### Service layer

Components never call `fetch` directly. Each domain has a service module, and
every one follows the same shape:

```js
export async function getRoomTypes(query) {
  if (!USE_MOCK_API) return request("/rooms/types", { params: query });
  await delay();
  return /* fixture data */;
}
```

`services/apiClient.js` centralises the base URL, the bearer header, JSON
parsing and error shaping (`ApiError`).

## Backend integration

The frontend is designed so that connecting the API requires **no component
changes**:

1. Set `VITE_API_BASE_URL` in `.env`.
2. Set `VITE_USE_MOCK_AUTH=false` once `POST /auth/login` exists.
3. Set `VITE_USE_MOCK_API=false` once the remaining endpoints exist.
4. Delete the mock branches and `services/mock/` when they are no longer needed.

The two flags are independent, so authentication can go live before the rest.

Endpoint paths expected by each service are written at its call sites — see
`roomService.js`, `bookingService.js`, and the others.

### Notes for the backend team

- **Route guards here are UX only.** `ProtectedRoute` and role-based navigation
  hide what a user shouldn't see; they are not a security boundary. Every
  request must be authorised server-side.
- **No card data touches this app.** `paymentService.js` accepts only a provider
  token. The card form must be a hosted field or iframe from the payment
  provider so the PAN never reaches our origin.

## Roles

Guest · Receptionist · Housekeeping · Service Staff · Administrator

One login page serves all five. The role returned by the API selects the
dashboard via `ROLE_ROUTES` in `services/authService.js`.

## Build phases

| Phase | Scope | Status |
|---|---|---|
| 1 | Design system, service layer, navbar, footer | Done |
| 2 | Home page | Done |
| 3 | Rooms, room details, facilities, activities, gallery, testimonials, contact | Done |
| 4 | Register, forgot password, auth context | Done |
| 5 | Booking flow | Done |
| 6 | Guest portal | Done |
| 7 | Receptionist dashboard | Done |
| 8 | Housekeeping dashboard | Done |
| 9 | Service staff dashboard | Done |
| 10 | Admin dashboard, 12 modules, analytics | Done |
| 11–13 | Responsive sweep, accessibility polish, flow testing | Done |

All 13 phases complete.

### Accessibility

Contrast is measured, not eyeballed. Every foreground/background pair in
`tokens.css` meets WCAG 2.1 AA — text at 4.5:1, form-control boundaries at 3:1
(1.4.11). `--line` stays light for decorative card edges; `--field-border`
exists separately because an input's edge identifies the control and has to
clear the bar.

Responsive layout and accessibility are exit criteria for every phase, not
tasks deferred to the end.
