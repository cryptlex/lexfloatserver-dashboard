# LexFloatServer Dashboard — Frontend Handoff

This document says *what the dashboard can show and let an admin do*, and *which REST endpoint backs each piece*. Wireframes are deliberately low-fidelity.

**Appendix A is the full type reference** — every request and response shape as TypeScript, plus a nullability table. Following sections show representative payloads inline; the appendix is authoritative.

---

## 1. Context

**Who uses the dashboard:** the customer's IT admin or ops engineer. Two jobs, roughly:
1. *Day-1 setup* — activate the server license for each product (online, or offline via request/response files in air-gapped networks).
2. *Day-2 operations* — "who is holding my seats right now?", "am I near my limit?", "when does my license expire?"

*LFS dashboard in this phase will not mutate state except for license activations/de-activations.*

The dashboard is served by LFS itself: its files are compiled into the LexFloatServer executable at build time and served at `/`, from the same host and port as the API. It ships inside that one binary — so your build output must be a static bundle with no server-side rendering. §2 covers this in detail.

---

## 2. Delivery & integration contract

### 2.1 It ships inside the binary

LexFloatServer is a single self-contained executable that the customer runs on their own machine. The dashboard is not deployed anywhere — **its files are compiled into that executable** and served from it. There is no nginx, no CDN, no container, no independent deploy, and no way to update the dashboard without shipping a new LFS build.

Mechanically: at LFS build time we copy your build output into a directory in the LFS source tree. Everything in that directory becomes the web root. A file you place at `assets/app.js` is served at `/assets/app.js`; `index.html` at its root is served at `/`.

What follows:

- **Your deliverable is a directory of static files** — the output of your production build, self-contained, ready to be served as-is. Hand it to us as a build artifact (a zip, or a repo and tag we can pull and build from).
- **Dashboard releases are backend releases.** A CSS fix ships as a new LexFloatServer version; there is no hotfix path and no way to push a change to an already-installed customer. Batch changes accordingly.
- **Size budget** The current dashboard is 1.8 MB, inside a ~15 MB binary.

### 2.2 History-API routing works — with one naming constraint

The server serves `index.html` at `200` for any path that is not a real file and not an API route.

Verified against the running server:

| Request | Result |
|---|---|
| `/`, `/products`, `/products/e0e4c1a2-…`, `/clients/3f2c8a91-…` | `200` + the shell, `Cache-Control: no-store` |
| `/main.<hash>.js`, `/main.<hash>.css`, `/favicon.ico` (exist) | `200` + correct MIME |
| `/nope.js` (missing asset) | `404` — **not** the shell |
| `/api/v4/products` (registered) | `200` |
| `/api/nope`, `/api/v4/nope`, `/api` | `404` + the `{code, message}` JSON envelope |
| `/apidocs`, `/apikeys`, `/api-usage` (app routes) | `200` + the shell |
| `POST /products` | `405` — the shell is only served to `GET`/`HEAD` |
| `/assets/` (a directory) | the shell; directory listing is off |

Three consequences worth designing around:

**The shell is never cached** (`no-store`), because it names your content-hashed
assets. Your assets keep the default caching. Do not add your own cache headers
to `index.html`.

**A missing asset is a real `404`.** if a browser holds a stale `index.html` naming a 
chunk a new release replaced, the chunk load fails as a failed fetch rather than 
succeeding with an HTML body. So a "chunk load failed → reload the page" recovery handler 
will actually fire. If we served the shell for missing assets instead, you would get
`Uncaught SyntaxError: Unexpected token '<'` and no recovery.

**The one constraint: an application route must not end in a dot-bearing
segment.** The server decides "asset or route?" from the last path segment, so
anything that looks like `name.ext` is treated as a file request and `404`s if no
such file exists. Precisely, and measured:

```
/clients?ip=10.0.4.18                   → shell    query strings are unaffected
/clients/10.0.4.18/details              → shell    a dot in a non-final segment is fine
/products/acme.cad/licenses             → shell
/clients/10.0.4.18                      → 404      dotted value as the last segment
/clients/ws-eng-014.corp.local          → 404
/clients/10.0.4.18/                     → 404      a trailing slash does NOT rescue it
/clients/3f2c8a91-0c1e-4a1e-9f2c-…      → shell    UUIDs are safe
```

Today's IA is unaffected: product ids and lease ids are both GUIDs. It becomes
live the first time you put a hostname, an IP, an email or a version string at
the end of a route. If you need one there, append a fixed suffix —
`/clients/10.0.4.18/overview` rather than `/clients/10.0.4.18` — or carry the
value in a query parameter.

### 2.3 Local development

#### Serving your build from disk — the `dev` binary

The shipped binary has the dashboard compiled into it, so it can only ever serve
the bundle it was built with. There is a second build for exactly this problem:

**A binary built with `-tags dev` serves the dashboard off disk instead of from
inside itself**, so you can point it at your build output and stop needing us in
the loop:

```sh
export LFS_DASHBOARD_DIR=/path/to/your/dist
sudo -E ./lexfloatserver-dev --start -c ./config.yml
```

With `LFS_DASHBOARD_DIR` unset it looks for `../lexfloatserver-dashboard/dist`,
which assumes the two repos sit side by side. Note `sudo -E`, or the variable is
dropped by the elevation.

Two things this gets you:

- **`npm run build` is picked up without restarting the server.** The shell is
  re-read per request in this mode, so rebuild and refresh — no restart, no
  re-handing-over of a binary.
- **It exercises the real serving path**, the same static handler, SPA fallback,
  MIME types and `404` behaviour as production. What you see here is what a
  customer gets. A dev server proxying to the API does not test any of that, so
  do a pass against the `dev` binary before each handover — routing bugs that
  only appear in the real bundle surface here and nowhere else.

**Ask us for the `dev` binary alongside the normal one**. Use the normal
one to check that your bundle behaves once compiled in; use the `dev` one for
day-to-day work.

### 2.4 Deliverables checklist

What we need from you at each release, as one directory of build output:

1. A fully self-contained static bundle, no external requests at runtime (§2.4).
2. `index.html` at the root of it, plus content-hashed asset filenames — hashing is the only cache-busting mechanism available to us.
3. `favicon.ico` and `site.webmanifest` at the root.
4. **Your source lives in your own repository, which we do not need access to.** We only consume build output.
5. Third-party license notices for every bundled dependency, as a text file. Customers are air-gapped, so these must ship with the product; we fold yours into the notices file in the LFS release.


## 3. Authentication

**Admin login.** `POST /api/login` with `{username, password}` against the admin list in `config.yml`. Returns `{"accessToken": "<JWT>"}`. Send it as `Authorization: Bearer <token>` on every protected endpoint.

- The JWT is HS256 with exactly two claims — `username` and `exp`. You can decode it client-side to render "signed in as" and an expiry countdown on Settings.
- It **expires after 1 hour or at process tear down** and there is no refresh endpoint.
- There are no roles and no per-user permissions. **Every logged-in admin can do everything.** Don't build a permissions UI.

**Which endpoints are protected:** the read endpoints for stats / license-info / meter-attributes / feature-entitlements / floating-license lists. **Activation and deactivation are *not* behind the auth middleware**, they are guarded only by the IP deny-list and product resolution, don't assume a 401 is possible on those.

**Also always in play:** an IP deny-list (`server.blockedIps`, empty by default) and trusted-proxy validation run before everything. A blocked admin gets `403 IP_ADDRESS_NOT_ALLOWED` / `PROXY_SERVER_NOT_TRUSTED`. Surface these as a clear "your IP is not permitted by this server's configuration" state, not a generic error — it's a config problem the admin can fix.

---

## 4. Screen map

```
/login                              Login
/                                   Overview        — server-wide health at a glance
/products                           Products        — flat list, paged + filtered
/products/:productId                Product detail  — license, meters, entitlements, activation
/clients                            Clients         — every lease on the server, paged + filtered
/clients/:id                        Client detail   — one lease
/settings                           Settings
```

Seven routes, three of them lists. The two list pages (`/products`, `/clients`) are the working surfaces; the two detail pages are drill-downs; Overview is the landing page and the wall-display view.

- **Both list pages are one request, server-side.** `/products` and `/floating-licenses` take the same `q` / `sort` / `order` / `limit` / `offset` parameters and return the same `{items, total, limit, offset}` envelope. No fan-out anywhere.
- **Products now have a display name** Render `displayName`, not the GUID.

---

## 5. Login

**Purpose:** authenticate, nothing more.

**Endpoint:** `POST /api/login` → `{accessToken}` | `400 {"message": "Authentication Failed. Please try again!"}`



```
┌──────────────────────────────────────────────┐
│                                              │
│            LexFloatServer                    │
│                                              │
│      ┌────────────────────────────────┐      │
│      │ Username                       │      │
│      ├────────────────────────────────┤      │
│      │ Password                       │      │
│      └────────────────────────────────┘      │
│                                              │
│      [        Sign in         ]              │
│                                              │
│      ⚠ Authentication failed.                │
│                                              │
│      Cryptlex, LLC. All rights reserved.     │
└──────────────────────────────────────────────┘
```

**Also render here:** the two config-level rejections, because they arrive before any credential is checked and a generic "authentication failed" would send the admin hunting for the wrong problem — `403 IP_ADDRESS_NOT_ALLOWED` ("this server's configuration does not permit your IP address") and `403 PROXY_SERVER_NOT_TRUSTED`.

---

## 6. Overview

**Purpose:** answer "is this server healthy, and which of my products need attention?" in one glance. Landing page after login, and the page an admin leaves open on a wall display.

**display:**
- Three tiles: **Products**, **Active clients**, **Offline clients** — all server-wide totals
- A table of every enabled product: **product name**, **activation status**, **clients**, **offline clients**
- Clear visual escalation for any product that is **not** `ok` — `not_activated`, `expired`, `suspended`, `grace_period_over`. A product in a bad state is the single most important thing this screen communicates. Sort those rows to the top.
- Server version, in the header or footer — not as a tile

**Functionality:**
- Click a product row → product detail
- Direct action to activate a `not_activated` product (deep-link into the product's licensing section) — this is the day-1 path and shouldn't require hunting
- Auto-refresh
- Nothing on this screen mutates state

**Deliberately not here:** seat ratios (`35 / 50`), expiry dates, and per-product lease settings. They belong on Products and Product detail. Keeping them off Overview also keeps it to two requests instead of two-plus-3N

**Endpoints:**

| Data | Endpoint |
|---|---|
| Version, product count, both totals | `GET /api/v4/server/stats` |
| Every product row — status **and** both client counts | `GET /api/v4/products` — one call, no fan-out |

```json
// GET /api/v4/server/stats
{ "version": "4.23.0", "productCount": 2,
  "totalFloatingClients": 37, "totalOfflineFloatingClients": 2 }
```

**There is no `status` field on this payload.** Liveness is the HTTP 200: if this call succeeded, the server is up. License state is per-product and comes from `GET /api/v4/products`. So there is no server-health tile to build, and nothing to build one out of.

```json
// GET /api/v4/products
{ "items": [
    { "id": "e0e4c1a2-…", "enabled": true, "status": "ok",
      "totalFloatingClients": 35, "totalOfflineFloatingClients": 2,
      "allowedFloatingClients": 50,
      "expiresAt": 1790000000, "serverSyncGracePeriodExpiresAt": 0 },
    { "id": "b7a91f30-…", "enabled": true, "status": "not_activated",
      "totalFloatingClients": 0, "totalOfflineFloatingClients": 0,
      "allowedFloatingClients": 0, "expiresAt": 0,
      "serverSyncGracePeriodExpiresAt": 0 },
    { "id": "4c1de92b-…", "enabled": false, "status": "disabled",
      "totalFloatingClients": 0, "totalOfflineFloatingClients": 0,
      "allowedFloatingClients": 0, "expiresAt": 0,
      "serverSyncGracePeriodExpiresAt": 0 }
  ],
  "total": 3, "limit": 100, "offset": 0 }
```

`status` ∈ `ok` | `not_activated` | `expired` | `suspended` |
`grace_period_over` | `disabled`. The last one is not a licence state: it means
`config.yml` declares the product with `enabled: false`, so it was never loaded
and has nothing to report. Every row also carries **`displayName`**,
which is what the table should show.

```
┌───────────────────────────────────────────────────────────────────────────┐
│ ▤ LexFloatServer                                      admin ▾   [Sign out]│
├──────────────┬────────────────────────────────────────────────────────────┤
│              │  Overview                                    [⟳ 10s  ⏸]    │
│  ▸ Overview  │                                                            │
│    Products  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│    Clients   │  │ PRODUCTS     │ │ ACTIVE       │ │ OFFLINE      │        │
│    Settings  │  │              │ │ CLIENTS      │ │ CLIENTS      │        │
│              │  │      2       │ │     37       │ │      2       │        │
│              │  │  1 needs     │ │              │ │              │        │
│              │  │  attention   │ │              │ │              │        │
│              │  └──────────────┘ └──────────────┘ └──────────────┘        │
│              │                                                            │
│              │  Products                                 View all →       │
│              │  ┌──────────────────────────────────────────────────────┐  │
│              │  │ PRODUCT            STATUS         CLIENTS  OFFLINE   │  │
│              │  ├──────────────────────────────────────────────────────┤  │
│              │  │ Acme Render        ▲ Not          0        0         │  │
│              │  │ b7a91f30-…           activated          [Activate]   │  │
│              │  ├──────────────────────────────────────────────────────┤  │
│              │  │ Acme CAD           ● Ok           35       2      →  │  │
│              │  │ e0e4c1a2-…                                           │  │
│              │  └──────────────────────────────────────────────────────┘  │
│              │                                                            │
│  v4.23.0     │                                                            │
└──────────────┴────────────────────────────────────────────────────────────┘
```

A `disabled` row belongs in this table too, rendered plainly with no counts and
no drill-through. It is the answer to "where did my product go?".

---

## 7. Products

**Purpose:** the inventory view. "What is this server serving, what state is each one in, and which license expires next?"

**Must display,** one row per enabled product:
- `displayName` — the product's label. **Do not put the GUID on the row**
- License status (`ok` / `not_activated` / `expired` / `suspended` / `grace_period_over`)
- Clients and offline clients
- Seats used / allowed, with the ratio made visible before it becomes an outage
- License expiry — relative ("in 184 days"), absolute on hover
- A grace-period warning marker when `serverSyncGracePeriodExpiresAt` is non-zero

**Functionality:**
- **Search** over the displayed name (`q=` also matches the id, for an admin pasting one from a script)
- **Filter** by status (multi-select) — "show me everything that isn't ok" is the common use
- **Sort** by name, clients, seats-used ratio, expiry. Status is a filter, not a sort — ranking the states by urgency is a client-side call, so if you want unhealthy products first, sort on the client or lead with the status filter.
- **Pagination** — see the reality check below
- Click a row → product detail
- Activate action inline on a `not_activated` row

**Endpoints:**

| Data | Endpoint |
|---|---|
| Everything on this page | `GET /api/v4/products` — one request, see §7.1 |

### 7.1 This page is one request, server-side

**`GET /api/v4/products` does all of it.** Search, status filter, sort, and
paging are query parameters, and the response is `{items, total, limit, offset}`
with counts, seat limits and expiry already on each row.

Map the page's controls straight onto the contract in §13:

| Control | Parameter |
|---|---|
| Search box | `q` — matches `displayName` and, for pasted values, `id` |
| Status multi-select | `status=expired,suspended` (CSV) |
| Column sort | `sort=` one of `displayName`, `id`, `totalFloatingClients`, `totalOfflineFloatingClients`, `allowedFloatingClients`, `seatsUsed`, `expiresAt`, `createdAt`, `activatedAt`, plus `order=asc｜desc` |
| Pagination | `limit` / `offset` |
| Show/hide disabled | `enabled=true｜false` |
| Licence columns | `expand=license` (and `license.meterAttributes`, `license.featureEntitlements`, `license.metadata`, `metadata`) |

Two behaviours worth designing around:

- **`sort=seatsUsed`** orders by the used/allowed ratio, which is the "closest to
  running out" column. A product with no seat limit sorts below every product
  that has one — an unlimited pool is never the one about to run out.
- **`sort=expiresAt`** treats "no expiry" as the far future, so ascending is
  expiring-soonest-first. `expiresAt` is `0` for a perpetual license and for a
  product that is disabled or not yet activated; all of those sort last rather
  than crowding the top of that view.
- **`sort=createdAt` and `sort=activatedAt` imply `expand=license`.** Both live
  on the licence rather than the base row, so the response carries the licence
  whether or not you asked for it — ordering rows by a value the payload does
  not contain is indistinguishable from a broken sort. A product with no licence
  sorts as `0`.
- **The default order is `expiresAt` ascending**, so the first paint is
  expiring-soonest-first. **There is no `sort=status`** — it is a 400, since an
  unknown sort field is never silently defaulted. Rank the states yourself if
  you want a triage order.

Still put `?q=`, `?status=`, `?sort=`, `?order=`, `?page=` in your own URL — it
is now a straight pass-through, and it makes the page linkable.

**Polling is safe here now** (one request), but Overview is still the screen
designed for it.

```
┌───────────────────────────────────────────────────────────────────────────┐
│ ▤ LexFloatServer                                      admin ▾   [Sign out]│
├──────────────┬────────────────────────────────────────────────────────────┤
│              │  Products                                          [⟳]     │
│    Overview  │                                                            │
│  ▸ Products  │  [ 🔍 search products           ]  Status: [ Any ▾ ]        │
│    Clients   │                                                            │
│    Settings  │  ┌──────────────────────────────────────────────────────┐  │
│              │  │ PRODUCT ▴         STATUS   CLIENTS OFFLINE SEATS  EXP│  │
│              │  ├──────────────────────────────────────────────────────┤  │
│              │  │ product-b7a91f30  ▲ Not       0      0     —     —  │  │
│              │  │                     activated             [Activate] │  │
│              │  ├──────────────────────────────────────────────────────┤  │
│              │  │ product-e0e4c1a2  ● Ok       35      2   35/50 184d  │  │
│              │  │                                         ▓▓▓▓▓▓▓░░  → │  │
│              │  ├──────────────────────────────────────────────────────┤  │
│              │  │ product-4c1de92b  ⚠ Grace     8      0    8/25  12d  │  │
│              │  │                     period ends                   →  │  │
│              │  │                     in 3 days                        │  │
│              │  └──────────────────────────────────────────────────────┘  │
│              │  3 products                             ‹ 1 of 1 ›         │
└──────────────┴────────────────────────────────────────────────────────────┘
```

**Empty states.** Two distinct ones, and they mean very different things: *no products configured* cannot actually happen (LFS refuses to start with zero enabled products), so if you see an empty array treat it as an error, not an empty state. *No products match your filters* is the real empty state.

---

## 8. Product detail

**Purpose:** everything about one product in one place — what it is licensed for, what it has consumed, what features it switches on, who is using it, and how to activate or release its license.

### 8.1 Header and summary

Product name, status badge, and three tiles: **seats in use**, **offline seats**, **lease durations**. Any grace-period expiry gets an alert above everything else — when `serverSyncGracePeriodExpiresAt` is non-zero, LFS has lost contact with Cryptlex and will stop issuing leases when it elapses. That is the most urgent thing this page can say.

### 8.2 License

- License key, **masked by default** — it's a credential and admins screenshot this page
- Status, leasing strategy, seat entitlement, and the **entitlement set** (`entitlementSet.displayName`, falling back to `.name`) — the licence's plan or tier. `null` when the licence grants none; render nothing rather than an empty row. Note it is a *licence* property, so two products on the same plan show the same value — it is not a product name
- Created / activated / expires
- Activation mode (initial vs current — tells you whether this was activated online or offline)
- Licensee: user (name/email/company) and organization (name + address) — **both may be `null`**.

When `status` is `not_activated`, `leasingStrategy` comes back as `""` and every date is `0`.

### 8.3 Meter attributes

Name, `totalUses` / `allowedUses`, `grossUses`. Sortable. `allowedUses: -1` means **unlimited**

**`floating` tells you what `totalUses` means, and the two readings need different words.** `floating: true` → uses currently held by live leases, which falls when a client goes away: "in use now". `floating: false` → consumption accumulated on the licence, which never falls: "used". `grossUses` is lifetime consumption either way, so on a floating attribute `grossUses - totalUses` is what has been handed back.

One timing caveat: a floating total releases an expired lease's uses when the server's sweep observes it, within about a minute of expiry — not at the instant of expiry. So a total can briefly read high just after a client disappears.

### 8.4 Feature entitlements

Feature name, `value`, `baseValue` when it differs, and per-entitlement `expiresAt` when non-zero. Searchable. Returns `[]` (not an error) when the license grants none.

### 8.4a Metadata

**Endpoint:** `GET /api/v4/products/:productId/server/metadata` → `{license: Metadata[], product: Metadata[]}`.

Two key/value lists the vendor set in Cryptlex: one on this licence, one on the
product.

Both lists are always present and are `[]` when empty, so a product with no
metadata gets a real empty state rather than a missing section. Values are
vendor-supplied free text.

Fetch on mount, not on the poll — it is two calls into LexActivator per request.

### 8.5 Licensing actions — activation & deactivation

The day-1 surface. Four flows, mutually exclusive by current state:

| Current state | Offer |
|---|---|
| `not_activated` | Online activation, or Offline activation |
| activated (`ok`, `expired`, `suspended`, `grace_period_over`) | Online deactivation, or Offline deactivation |

**Online activation** — `POST /api/v4/products/:productId/server/activate` with `{"licenseKey": "...", "metadata": [{"key","value"}]}` → `{"code": "SERVER_LICENSE_ACTIVATED", "message": "..."}`. Requires LFS to reach Cryptlex.

**Offline activation** — three steps, and the UI must make the file handoff obvious because the admin is walking between an air-gapped machine and an internet-connected one:
1. `POST .../server/offline-activation-request` `{licenseKey, metadata}` → `{"offlineRequest": "<blob>"}`. Offer as a **file download** (`.offreq`), not just copyable text.
2. Admin uploads that file to the Cryptlex web portal and gets a response file back. Link to the portal and state this step explicitly — it's the part people get stuck on.
3. `POST .../server/offline-activate` `{licenseKey, offlineResponse: "<file contents>"}` → `{code, message}`. Accept drag-and-drop of the `.offres` file and read it client-side.

**Online deactivation** — `POST .../server/deactivate` `{licenseKey}`. **Requires the same license key** as a confirmation; don't auto-fill it from `license-info`, the re-entry is the safety check.

**Offline deactivation** — `POST .../server/offline-deactivate` `{licenseKey}` → `{"offlineRequest": "<blob>"}`, downloadable, to be submitted to the portal. Note the asymmetry: this **deactivates locally immediately** and hands you a file to reconcile with the portal afterwards. Say so in the UI — the admin should not believe it's pending.

**Blocking condition you must handle:** both deactivation flows return `400 OUTSTANDING_OFFLINE_LICENSES` if any offline lease is still outstanding. Detect it ahead of the click — `totalOfflineFloatingClients > 0` from `.../server/stats` — and disable the button with an explanation plus a link to this product's clients, rather than letting the admin fail into an error toast.

⚠ **The dashboard cannot clear the blockage.** It has no way to release a lease (§9), so when offline leases are outstanding the only thing that clears them is their own expiry. Say that plainly next to the disabled button — an admin who is not told will hunt the UI for an action that isn't there.

Activation errors are specific and worth mapping to real sentences, not raw codes. The set you'll actually see: `SERVER_INVALID_LICENSE_KEY`, `SERVER_LICENSE_ALREADY_ACTIVATED`, `SERVER_LICENSE_NOT_ACTIVATED`, `SERVER_LICENSE_EXPIRED`, `SERVER_LICENSE_SUSPENDED`, `SERVER_LICENSE_REVOKED`, `SERVER_LICENSE_ACTIVATION_LIMIT_REACHED`, `SERVER_LICENSE_DEACTIVATION_LIMIT_REACHED`, `SERVER_NETWORK_ERROR`, `SERVER_LICENSE_VM_ACTIVATION_NOT_ALLOWED`, `SERVER_LICENSE_CONTAINER_ACTIVATION_NOT_ALLOWED`, `SERVER_INVALID_OFFLINE_ACTIVATION_RESPONSE`, `SERVER_OFFLINE_ACTIVATION_RESPONSE_FILE_EXPIRED`, `SERVER_LICENSE_EXPIRY_LESS_THAN_LEASE_DURATION`, `SERVER_INSUFFICIENT_PERMISSION`, `SERVER_INCORRECT_TIME`, `SERVER_TIME_MODIFIED`, `SERVER_LICENSE_COUNTRY_NOT_ALLOWED`, `SERVER_LICENSE_IP_ADDRESS_NOT_ALLOWED`, `SERVER_INVALID_LICENSE_TYPE`. Ask us for copy on any you're unsure about; several are subtle.

### 8.6 Clients using this product

A link to `/clients?productId=<id>`.

### 8.7 Endpoints

| Data | Endpoint |
|---|---|
| Client counts | `GET /api/v4/products/:productId/server/stats` |
| License, seats, licensee | `GET /api/v4/products/:productId/server/license-info` |
| Meter attributes | `GET /api/v4/products/:productId/server/license-meter-attributes` |
| Feature entitlements | `GET /api/v4/products/:productId/server/feature-entitlements` |
| Licence + product metadata | `GET /api/v4/products/:productId/server/metadata` — see §8.4a |
| Lease durations, offline quota | `GET /api/v4/products/:productId/server/config` — **not** auth-protected, also consumed by client SDKs |
| Leases for §8.6 | `GET /api/v4/floating-licenses?productId=<id>&limit=5` — the scoped route is unpaged |
| Activation / deactivation | `POST .../server/{activate,deactivate,offline-activation-request,offline-activate,offline-deactivate}` |

Seven GETs to paint the page, six of them product-scoped. That is the one place where the product-scoped API is exactly the right shape, so **build it first**. Refresh the tiles and the clients strip on a poll; leave license, meters and entitlements to mount-and-demand.

```
┌───────────────────────────────────────────────────────────────────────────┐
│ ‹ Products                                                                │
│                                                                           │
│  Acme CAD    ● Ok                                                         │
│  e0e4c1a2-4b7f-…  ⧉                                          [⟳]          │
│                                                                           │
│  ⚠ Server sync grace period ends in 3 days (24 Aug 2026, 14:02). This     │
│    server cannot reach Cryptlex. Leases stop being issued after that.     │
│                                                                           │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐           │
│  │ SEATS IN USE     │ │ OFFLINE SEATS    │ │ LEASE DURATION   │           │
│  │  35 / 50         │ │   2 / 5          │ │   60 s           │           │
│  │  ▓▓▓▓▓▓▓▓▓▓░░░   │ │   ▓▓▓▓░░░░░░░░   │ │ max offline 30 s │           │
│  └──────────────────┘ └──────────────────┘ └──────────────────┘           │
│                                                                           │
│  License                                                                  │
│  ───────────────────────────────────────────────────────────────────      │
│  Key              ••••-••••-••••-••••   [reveal] [copy]                   │
│  Status           ● Ok            Leasing      per-instance               │
│  Seats            50              Activation   online (initially online)  │
│  Created          14 Feb 2026     Activated    15 Jun 2026                │
│  Expires          21 Feb 2027  (in 184 days)                              │
│                                                                           │
│  Licensed to                          Organization                        │
│  ────────────────────────────         ───────────────────────────         │
│  Jane Doe                             Acme Industries                     │
│  jane@acme.example                    12 Foundry Rd, Springfield          │
│  Acme Industries                      IL 62704, US                        │
│                                                                           │
│  Meter attributes                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ NAME        USED / ALLOWED            GROSS                         │  │
│  ├─────────────────────────────────────────────────────────────────────┤  │
│  │ renders     240 / 1000  ▓▓▓░░░░░░     315                           │  │
│  │ exports      88 / ∞                    88                           │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  Feature entitlements                       [ 🔍 search features      ]   │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ FEATURE            VALUE      BASE       EXPIRES                    │  │
│  ├─────────────────────────────────────────────────────────────────────┤  │
│  │ PDF Export         true       false      —                          │  │
│  │ Max Layers         250        100        21 Feb 2027                │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  Clients                                       View all 35 in Clients →   │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ WS-ENG-014   10.0.4.18   Win 10.0…  4.9.0   renewed 8s ago       →  │  │
│  │ WS-ENG-021   10.0.4.25   Win 10.0…  4.9.0   renewed 3s ago       →  │  │
│  │ MAC-DES-02   10.0.9.7    macOS 15…  4.9.0   renewed 41s ago      →  │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  Licensing                                                                │
│  ───────────────────────────────────────────────────────────────────      │
│  ( • ) Online deactivation      (   ) Offline deactivation                │
│  Re-enter the license key to confirm.                                     │
│  [ ................................ ]          [  Deactivate  ]           │
│                                                                           │
│  ⓘ Disabled: 2 offline leases are still outstanding. They expire in 24s.  │
└───────────────────────────────────────────────────────────────────────────┘
```

**Not-activated variant of §8.5** — the whole page collapses to the header plus this:

```
┌───────────────────────────────────────────────────────────────────────────┐
│  Acme Render   ▲ Not activated                                            │
│  b7a91f30-…  ⧉                                                            │
│                                                                           │
│  This product has no active server license. LFS will refuse every lease   │
│  request for it until one is activated.                                   │
│                                                                           │
│  ( • ) Online activation        (   ) Offline activation                  │
│  ─────────────────────────────────────────────────────────────────────    │
│  License key                                                              │
│  ┌───────────────────────────────────────────────────┐                    │
│  └───────────────────────────────────────────────────┘                    │
│  Activation metadata (optional)                        [+ add]            │
│  ┌──────────────┐ ┌──────────────────────────┐  ✕                         │
│  │ key          │ │ value                    │                            │
│  └──────────────┘ └──────────────────────────┘                            │
│                                              [    Activate    ]           │
│                                                                           │
│  ── offline variant of the same card ─────────────────────────────────    │
│  Step 1  License key [ ................ ]   [Generate request file]       │
│          → downloads acme-render.offreq                                   │
│  Step 2  Upload that file at portal.cryptlex.com ↗                        │
│          Download the response file it gives you.                         │
│  Step 3  ┌ drop .offres file here, or browse ┐      [   Activate   ]      │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Clients

**display,** one row per lease:
- Hostname, username and IP. `username` is the OS account name the client reports (e.g. `jdoe`); it is `""` when the client does not report one, so expect blanks on leases held by older clients.
- **`userHash` is not sent.** It is a salted digest of the same OS account name `username` already gives you in the clear, so the server stores it and deliberately does not serialise it. Do not build against it; it will not be in the payload.
- **`id` is sent, but is not for display.** You need it to key rows and to open client detail, and there is no other handle for a lease — but a bare UUID is not something an admin identifies a client by. Identify rows on screen by hostname, username and IP.
- **Product** — `productDisplayName` is the label to render; `productId` is alongside it for filtering and links. In a flat table this is the column that makes the page make sense.
- OS + version, client SDK version
- Offline flag
- Last renewed (`updatedAt`) — the liveness signal, more useful than `createdAt`
- Expires — as a **live countdown**, not an absolute timestamp; default leases are 60s
- Per-client custom metadata — secondary, fine behind an expand-a-row. **Opt-in:** pass `?expand=metadata`, or read the detail route, which returns it unasked.

**Functionality:**
- **Search** over hostname, IP and username
- **Filter** by product (multi-select), hostname (multi-select), IP (multi-select), offline-only, "expiring within N seconds", and absolute `createdAt`/`updatedAt`/`expiresAt` ranges
- **`hostname`/`ip` filter vs `q` search.** `q` is a substring match — `q=10.0.4.1` also returns `.18` and `.19`. The filters are exact and case-insensitive, and take CSV, so they are what a deep-link ("every lease this host holds, across products") should use.
- **Stale leases** are `updatedBefore=<now - N>`: a client that died still holding a seat, which is the main reason an admin comes to this page at all. Prefer `expiringWithin` over `expiresBefore` for anything that polls — see §13.
- **Sort** by hostname, product, renewed, expires. Default: most-recently-renewed first.
- **Pagination**, 50 or 100 per page
- **Auto-refresh** — this table changes every few seconds in real deployments. Pausable, and pause automatically while rows are selected or a menu is open; an admin comparing rows does not want the table reshuffling under the cursor.
- Click a row → client detail

**Endpoints:**

| Data | Endpoint |
|---|---|
| Every lease — search, filter, sort, paging | `GET /api/v4/floating-licenses` — one request, see §9.1 |
| Seat limits behind the tiles | `GET /api/v4/products` — `allowedFloatingClients` on every row. Not needed for the product column; the lease row is already named |

Lease payload (`FloatingLicense`):
```json
{ "id": "3f2c…", "productId": "e0e4c1a2-…", "productDisplayName": "Acme CAD",
  "ip": "10.0.4.18",
  "os": "Windows", "osVersion": "10.0.19045",
  "hostname": "WS-ENG-014", "username": "jdoe",
  "offline": false, "clientVersion": "4.9.0",
  "createdAt": 1755600000, "updatedAt": 1755600480, "expiresAt": 1755600540,
  "metadata": [ { "key": "dept", "value": "eng" } ],
  "meterAttributes": null }
```

### 9.1 This page is one request, server-side

**`GET /api/v4/floating-licenses` does all of it.** Every lease on the server, in
one call, with search, filters, sort and paging as query parameters and the same
`{items, total, limit, offset}` envelope as `/products`. Each row carries its own
`productId` and `productDisplayName`.

Map the page's controls onto the contract:

| Control | Parameter |
|---|---|
| Search box | `q` — matches `hostname`, `ip` and `username` |
| Product filter | `productId=` (CSV for multi-select) |
| Online/offline toggle | `offline=true｜false` |
| Column sort | `sort=` one of `hostname`, `ip`, `createdAt`, `updatedAt`, `expiresAt`, `productId`, `offline`, plus `order=asc｜desc` |
| Pagination | `limit` / `offset` |
| "Expiring soon" | `expiringWithin=<seconds>` |
| Time ranges | `createdAfter` / `createdBefore` / `updatedAfter` / `updatedBefore` / `expiresAfter` / `expiresBefore`, absolute epoch seconds |
| Per-lease detail columns | `expand=metadata,meterAttributes` |

Behaviours worth designing around:

- **The default order is `updatedAt` descending** — most-recently-renewed first,
  so the page opens on the clients still checking in. `updatedAt` is the liveness
  signal, not `createdAt`.
- **Hostname sorting is case-insensitive**, so `lab-07` and `WS-ENG-014` interleave
  the way a reader expects rather than splitting into two blocks.
- **`sort=offline` puts online first**, so `order=desc` groups the offline leases
  at the top — they are the ones that block a deactivation.
- **A filter this collection does not declare is a `400`**, not an ignored
  parameter. `?status=expired` is a *products* filter and is refused here.


- **Poll at 10s here, not 5s.** One request per tick, but it walks every product's lease table server-side.
- **Aggregation is not atomic.** Leases are garbage-collected concurrently, so `total` is a smear rather than a snapshot and a row can vanish between ticks. Never diff pages for correctness.
- **Ask for the page you render.** `limit`/`offset` are server-side; do not fetch everything and slice.


```
┌───────────────────────────────────────────────────────────────────────────┐
│ ▤ LexFloatServer                                      admin ▾   [Sign out]│
├──────────────┬────────────────────────────────────────────────────────────┤
│              │  Clients                                     [⟳ 10s  ⏸]    │
│    Overview  │                                                            │
│    Products  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  ▸ Clients   │  │ ACTIVE       │ │ OFFLINE      │ │ NEAREST      │        │
│    Settings  │  │ CLIENTS      │ │ CLIENTS      │ │ LIMIT        │        │
│              │  │     37       │ │      2       │ │ Acme CAD     │        │
│              │  │              │ │              │ │ 35 / 50      │        │
│              │  └──────────────┘ └──────────────┘ └──────────────┘        │
│              │                                                            │
│              │  [ 🔍 hostname or IP  ] [Product: Any ▾] [☐ offline only]  │
│              │                                                            │
│              │  ┌──────────────────────────────────────────────────────┐  │
│              │  │☐│HOSTNAME    PRODUCT   IP        OS     RENEWED EXP │  │
│              │  ├──────────────────────────────────────────────────────┤  │
│              │  │☐│WS-ENG-014  Acme CAD  10.0.4.18 Win10  8s ago  52s▸│  │
│              │  │☐│WS-ENG-021  Acme CAD  10.0.4.25 Win10  3s ago  57s▸│  │
│              │  │☑│MAC-DES-02  Acme CAD  10.0.9.7  mac15  41s ago 19s▸│  │
│              │  │☐│SIM-RIG-07  Acme Sim  10.0.7.3  Linux  6s ago  54s▸│  │
│              │  │☐│FIELD-LAP-3 Acme CAD  10.0.2.90 Win11  2h ago  12m▾│  │
│              │  │ │  ⚑ offline lease   dept=field   site=north       │  │
│              │  │☐│OLD-BOX-1   Acme Sim  10.0.7.9  Win10  9s ago  51s │  │
│              │  └──────────────────────────────────────────────────────┘  │
│              │  1 selected                                                │
│              │  39 clients                        ‹ 1 of 1 ›              │
└──────────────┴────────────────────────────────────────────────────────────┘
```

**The NEAREST LIMIT tile** is the cross-product number worth surfacing: whichever product is closest to its `allowedFloatingClients`. It is free now — `allowedFloatingClients` and both counts are on every `/api/v4/products` row, so it is a `max()` over a list you already fetched.

**The product column needs no join.** Every lease row carries
`productDisplayName` next to `productId`, so render the former and keep the
latter for `?productId=` filters and product links. It is the same label
`/products` reports, never empty — a product without a configured name falls back
to a stable `product-<hash>` derived from its id. There is no `id → displayName`
map to build, cache or invalidate.

**Empty states:** "no clients are currently holding a seat" (real and common on a quiet server — say it plainly, it is not an error) versus "no clients match your filters".

---

## 10. Client detail

**Purpose:** everything known about one lease.

### 10.1 The route does not carry the product

**Use `/clients/:id`.** `GET /api/v4/floating-licenses/:id` resolves the owning product from the lease id, so a lease id is a sufficient handle and the fan-out happens server-side. It answers `404` when no loaded product holds the id, and it defers nothing — `metadata` and `meterAttributes` come back without an `expand`.

**Must display:**
- Hostname, IP, OS + version, SDK version
- Product, linked to product detail
- Offline flag, called out prominently — offline leases behave differently and block deactivation
- Lease timeline: acquired (`createdAt`), last renewed (`updatedAt`), expires (`expiresAt`) with a live countdown
- Custom metadata as a key/value list — `null` when the client sent none, not `[]`

**Functionality:** jump to the product. Poll `updatedAt` / `expiresAt` so the countdown stays honest; if the lease disappears (`404`), say "this lease has expired or been released by its client" and offer the way back — don't render a crash.

**Endpoints:** `GET /api/v4/floating-licenses/:id`, or `GET /api/v4/products/:productId/floating-licenses/:id` when you already hold the product.

```
┌───────────────────────────────────────────────────────────────────────────┐
│ ‹ Clients                                                                 │
│                                                                           │
│  WS-ENG-014                                                               │
│  3f2c8a10-…  ⧉      Acme CAD →                                            │
│                                                                           │
│  ┌───────────────────────────┐  ┌────────────────────────────────────┐    │
│  │ EXPIRES IN                │  │ Acquired      2 Sep 2026, 09:20:00  │   │
│  │      52 s                 │  │ Last renewed  8 seconds ago         │   │
│  │  ▓▓▓▓▓▓▓▓▓░░░░            │  │ Expires       2 Sep 2026, 09:29:00  │   │
│  └───────────────────────────┘  └────────────────────────────────────┘    │
│                                                                           │
│  Client                                                                   │
│  ───────────────────────────────────────────────────────────────────      │
│  Hostname       WS-ENG-014            IP           10.0.4.18              │
│  OS             Windows 10.0.19045    SDK version  4.9.0                  │
│  Lease type     Online                                                    │
│                                                                           │
│  Metadata                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ dept        eng                                                     │  │
│  │ site        north                                                   │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  Meter usage        renders  7                                            │
└───────────────────────────────────────────────────────────────────────────┘
```

**This page is thin, and that is a backend limit rather than a design choice.** The lease DTO serialises 15 fields: the identity, product and timing block, plus `metadata` and `meterAttributes`, which this route returns unasked. `userHash` and `fingerprint` are held server-side and never sent, and `id` is sent but not for display (§9). The lease's effective duration and host entitlement set go only to the SDK. Design the page so those can be slotted in; don't invent placeholder content for them now.

---

## 11. Settings

**Purpose:** show how this server is configured, who you're signed in as, and let the admin tune the dashboard's own behaviour.

**Be clear about the ceiling before designing this page: almost nothing here is editable, and that is by design.** Every real setting — port, SSL, admin users, IP deny-list, trusted proxies, products, lease durations, logging — lives in `config.yml`, is read once at startup, and requires a service restart to change. There is no config-write API and we are not planning one.

So Settings is two sections: read-only server facts and local preferences.

### 11.1 Server

Read-only. Version, product count, and both client totals come from `GET /api/v4/server/stats`. Per-product effective lease settings come from `GET /api/v4/products/:productId/server/config` — one call per product, unauthenticated.

**Everything else comes from `GET /api/v4/server/config`** (🔒, one call, no product scope). It reports listening port, IPv6, Cryptlex host, IP deny-list, allowed clock offset, lease-duration grace period, SSL on/off, trusted proxies, log level and file-logging settings, admin usernames, and the `productDefaults` block every product inherits from. Full type in Appendix A.

Three things it deliberately does not give you, so don't design around them:

- **No secrets.** The auth API key is reported as the boolean `apiKeyConfigured`; admin passwords, password hashes, license keys and the custom device fingerprint are absent entirely. Render the boolean as *"configured"* / *"not configured"*, and don't add a reveal affordance — there is nothing behind it.
- **No host paths or process internals.** No `configFilePath` or `configVersion`, and `ssl` carries `enabled` only — not the certificate paths. They are paths on a host the dashboard has no access to, so there is nothing it could do with them. There is no `customDeviceFingerprintSet` flag either; it would report a setting that only takes effect in a special build.
- **No writes.** Every field here is read from `config.yml` at startup and needs a service restart to change. Render it as facts, not as a form.

`productDefaults` is worth a distinct row group from the per-product effective values: it answers *what a newly added product would inherit*, which the resolved per-product numbers cannot tell you.

### 11.2 Session

Signed-in username and token expiry, both decoded client-side from the JWT (§3). A visible countdown matters because expiry is abrupt and there is no refresh — an admin who sees "session ends in 4 minutes" mid-way through an offline activation can re-authenticate before losing the form. Sign out clears the token.

### 11.3 Preferences (browser-local)

Stored in `localStorage`, never sent to the server: poll interval and pause-by-default, absolute vs relative timestamps, rows per page, theme. These are the only genuinely interactive controls on the page — which is fine; they're also the ones an admin actually reaches for.

```
┌───────────────────────────────────────────────────────────────────────────┐
│ ▤ LexFloatServer                                      admin ▾   [Sign out]│
├──────────────┬────────────────────────────────────────────────────────────┤
│              │  Settings                                                  │
│    Overview  │                                                            │
│    Products  │  Server                                                    │
│    Clients   │  ───────────────────────────────────────────────────────   │
│  ▸ Settings  │  Version           4.23.0                                  │
│              │  Products served   3                                       │
│              │  Active clients    37        Offline clients   2           │
│              │                                                            │
│              │  ⓘ Server configuration — port, SSL, admin users, IP       │
│              │    deny-list, logging — is managed in config.yml on the    │
│              │    host and applied at startup. It cannot be changed here. │
│              │                                                            │
│              │  Lease settings per product                                │
│              │  ┌──────────────────────────────────────────────────────┐  │
│              │  │ PRODUCT      LEASE   MAX OFFLINE   OFFLINE SEATS     │  │
│              │  ├──────────────────────────────────────────────────────┤  │
│              │  │ Acme CAD     60 s       30 s            5            │  │
│              │  │ Acme Sim     120 s      60 s            0            │  │
│              │  │ Acme Render  60 s       30 s            0            │  │
│              │  └──────────────────────────────────────────────────────┘  │
│              │                                                            │
│              │  Session                                                   │
│              │  ───────────────────────────────────────────────────────   │
│              │  Signed in as     admin                                    │
│              │  Session ends     in 42 minutes        [ Sign out ]        │
│              │                                                            │
│              │  Preferences                              (this browser)   │
│              │  ───────────────────────────────────────────────────────   │
│              │  Auto-refresh        [ 10 s ▾ ]   ☑ enabled                │
│              │  Timestamps          ( • ) relative   (   ) absolute       │
│              │  Rows per page       [ 50 ▾ ]                              │
│              │  Theme               ( • ) system  ( ) light  ( ) dark     │
│              │                                                            │
│              │  About                                                     │
│              │  ───────────────────────────────────────────────────────   │
│              │  LexFloatServer 4.23.0 · Cryptlex, LLC.                    │
│              │  Third-party notices →                                     │
└──────────────┴────────────────────────────────────────────────────────────┘
```

---

## 12. Cross-cutting behaviours

**Timestamps.** Every `*At` field is a **Unix epoch in seconds** (not milliseconds — multiply by 1000 for JS `Date`). A value of `0` means "not set / not applicable" — render `—`, never `1 Jan 1970`. Show relative time in the cell, absolute local time on hover.

**Durations.** `leaseDuration` and `maxOfflineLeaseDuration` are **seconds**.

**`-1` means unlimited** anywhere it appears in a limit field (`allowedUses`, and limit fields generally). Never show the literal.

**Refresh.** Poll Overview and Clients; refresh Products, Product detail and Settings on mount and on demand. Suggested defaults: **Overview 10s**, **Clients 10s** (one paged request per tick now), **Client detail 5s** (one cheap request, and the countdown is the point). Make the interval visible and pausable, pause while a form is dirty or rows are selected, and pause when the tab is hidden — an idle wall display should not poll all night.

**Error envelope.** All errors share one shape: `{"code": "SOME_CODE", "message": "..."}`, with `code` sometimes absent (401/404). Status codes in play: `400` invalid request or blocked business rule, `401` bad or expired token, `403` IP or proxy rejected, `404` product or lease not found, `500` server error — note that **several license-state failures come back as `500` with a meaningful `code`** (`SERVER_LICENSE_EXPIRED`, `SERVER_LICENSE_SUSPENDED`, `SERVER_LICENSE_GRACE_PERIOD_OVER`, `SERVER_TIME_MODIFIED`). Branch on `code`, not on status class alone.

**An unserved product answers `400 INVALID_PRODUCT_ID`, not `404`.** Every product-scoped route (`/api/v4/products/:productId/…`) reports an unknown *or disabled* product this way. The status code is deliberate and will not change: the client SDK maps `404` to "your licence was deleted server-side", so returning it here would tell a customer their licence was revoked when their config simply names a product this server does not serve. Treat `400` + `INVALID_PRODUCT_ID` as your not-found state, with a route back. Bookmarked URLs hit it after a config change — and so does clicking a **disabled** product, which the products list deliberately shows.

**Partial failure.** No screen fans out (§7.1, §9.1), so a per-product request failure cannot half-render a table. What remains is per-row state that is legitimately absent: a disabled product has no counts, no seats and no expiry, and a not-yet-activated one has no licence. Render those as a real state, not as an error and not as zeros that look like real zeros.

**Naming.** The API says *floating license*; end users think *client* or *seat*. Use **Clients** in navigation, **lease** for the time-bound grant, and reserve *license* for the server license.

**Air-gapped constraint (hard).** No runtime CDN fonts, scripts, icon sets, analytics, or telemetry. Assume the browser has no internet access at all. See §2.4.


### 12.1 What you can leave out

The API returns more than this dashboard needs. Everything below is in the
payload and should stay out of the UI — not hidden behind a toggle, just not
built. Skipping it is the difference between a screen an admin can read and one
they have to decode.

**The product GUID.** `displayName` is what a product is called; `id` is
a key you keep in your model for routes and `?productId=`. It does not
belong on a row, in a header, or behind a copy button. The one place a raw id is
worth offering is Product detail, in a diagnostics or support block, because
support tickets and log file names are keyed by it — and even there it is a
detail, not the page title.

**The licence's `createdAt`.** When a licence was *minted* in Cryptlex says
nothing about the server an admin is looking at. The two dates that matter are
`activatedAt` (when this server bound the licence) and `expiresAt` (when it stops
working). `createdAt` is still on the wire, and `sort=createdAt` still exists for
anyone who wants it, but do not give it a column or a field in the licence panel.

**Sub-resources on rows that cannot have them.** A disabled product is not loaded
into the process: no licence, no seats, no leases, no metadata. Requesting
`expand=license…` for it returns `null` because there is genuinely nothing there,
not because the request failed. So **do not expand a disabled product, and do not
call product-scoped routes for one** — you already know from the list row
(`enabled: false`, `status: "disabled"`) everything that page can truthfully say.
Render the disabled state from the row you already have. The same applies to
`not_activated`: the licence object exists but every field in it is empty.

**Expansions a screen does not render.** `expand=` costs native calls per row
returned (§13). The Products table needs none of them. Product detail needs
them all, for one product. Do not expand on a list "in case".

**`userHash` and `fingerprint`.** Not in the payload at all, by design.
`username` is the OS account name and is not an authenticated identity — label it
accordingly.

**Whole types.** `ServerStats`, `ServerConfig`, `ServerLicenseInfo`,
`FloatingLicenseActivation`, `FeatureFlag` and `ServerHello` belong to the legacy
API and the SDK lease protocol. Appendix A.6 has the detail; ignore them.

**The legacy unversioned endpoints.** `/api/server/*` and `/api/floating-licenses*`
exist only for backward compatibility and refuse to answer when more than one
product is configured. Target `/api/v4` exclusively.

---

## 13. Endpoint reference

Dashboard-relevant endpoints only. `🔒` = requires `Authorization: Bearer <jwt>`.

| Method | Path | Purpose | Screen |
|---|---|---|---|
| POST | `/api/login` | Obtain JWT | Login |
| GET | 🔒 `/api/v4/server/stats` | Version, product count, server-wide totals | Overview, Settings |
| GET | 🔒 `/api/v4/server/config` | Read-only `config.yml` view: port, SSL, proxies, IP deny-list, logging, admin usernames, product defaults | Settings |
| GET | 🔒 `/api/v4/products` | Enveloped collection: id, **displayName**, enabled, status, counts, seat limit, expiry, grace period. Takes `q`/`sort`/`order`/`limit`/`offset`/`expand`/`productId`/`status`/`enabled` | Overview, Products, Clients (seat limits only) |
| GET | 🔒 `/api/v4/products?expand=license` | Every product's licence in one call, key in full; also `license.meterAttributes`, `license.featureEntitlements`, `license.metadata`, `metadata` | Products, an "expiring soon" view |
| GET | 🔒 `/api/v4/floating-licenses` | Enveloped collection of **every lease on the server**, each row naming its product (`productId` + `productDisplayName`). Takes `q`/`sort`/`order`/`limit`/`offset`/`productId`/`hostname`/`ip`/`offline`/`expiringWithin`/`created｜updated｜expires` + `After｜Before`/`expand`. Default sort `updatedAt` desc | **Clients** |
| GET | 🔒 `/api/v4/floating-licenses/:id` | One lease, product-agnostic. `404` if no product holds the id | Client detail |
| GET | 🔒 `/api/v4/products/:productId/server/stats` | Per-product client counts | Overview, Products, Product detail |
| GET | `/api/v4/products/:productId/server/config` | Lease durations, offline quota | Product detail, Settings |
| GET | 🔒 `/api/v4/products/:productId/server/license-info` | Full license detail, seat limit, expiry | Products, Product detail |
| GET | 🔒 `/api/v4/products/:productId/server/license-meter-attributes` | Meter usage | Product detail |
| GET | 🔒 `/api/v4/products/:productId/server/feature-entitlements` | Feature entitlements | Product detail |
| GET | 🔒 `/api/v4/products/:productId/server/metadata` | Licence and product metadata lists | Product detail |
| GET | 🔒 `/api/v4/products/:productId/floating-licenses` | That product's leases, as a bare unpaged array — prefer `/floating-licenses?productId=` | — |
| GET | 🔒 `/api/v4/products/:productId/floating-licenses/:id` | One lease, when you already hold the product | — |
| DELETE | `/api/v4/products/:productId/floating-licenses/:id` | A client handing its own seat back; gated on the product's licence being valid | — (SDK only) |
| POST | `/api/v4/products/:productId/server/activate` | Online activation | Product detail |
| POST | `/api/v4/products/:productId/server/deactivate` | Online deactivation | Product detail |
| POST | `/api/v4/products/:productId/server/offline-activation-request` | Generate `.offreq` | Product detail |
| POST | `/api/v4/products/:productId/server/offline-activate` | Apply `.offres` | Product detail |
| POST | `/api/v4/products/:productId/server/offline-deactivate` | Generate deactivation request | Product detail |
| GET | `/api/v4/server/public-key` | Server RSA public key | — (SDK only) |

**The server-scoped v4 surface is `server/stats`, `server/config`, `server/public-key`, `products`, `floating-licenses` and `floating-licenses/:id`.** Everything else is under `/products/:productId`.

All the collection endpoints take the same query parameters and return the same envelope:

```json
{ "items": [ … ], "total": 137, "limit": 100, "offset": 0 }
```

| Param | Applies to | Notes |
|---|---|---|
| `q` | products | case-insensitive substring; matches **`displayName` and `id`**, never the licence key |
| `q` | floating-licenses | case-insensitive substring; matches **hostname, ip and username** only — not os, not clientVersion |
| `sort` | all | whitelisted per collection — **an unknown field is a 400, not a default** |
| `order` | all | `asc｜desc`; anything else is a 400 |
| `limit` | all | default **20**, clamped to **100**; a larger value is silently reduced, not refused. `0`, negative or non-numeric is a 400 — there is no unpaged mode |
| `offset` | all | negative becomes 0; past the end is an empty `items` with the true `total` |
| `productId`, `status` | products | CSV — any listed value matches |
| `productId`, `hostname`, `ip` | floating-licenses | CSV — any listed value matches, case-insensitively. Exact match, not substring: `hostname=ws-eng` matches nothing, `q=ws-eng` is the substring search |
| `offline` | floating-licenses | `true｜false｜1｜0` |
| `expiringWithin` | floating-licenses | whole seconds from now, `0`–`2147483647`. Matches leases whose `expiresAt` is at or before that instant, **including ones already elapsed but not yet swept** — those are the most urgent rows, not ones to hide. A lease with `expiresAt: 0` (never) never matches. The window is evaluated once per request. |
| `createdAfter`, `createdBefore`, `updatedAfter`, `updatedBefore`, `expiresAfter`, `expiresBefore` | floating-licenses | absolute unix seconds, `0` or greater; negative or non-numeric is a 400. **Both ends inclusive**, so a pair is a closed range and the same value twice is an exact instant. A timestamp of `0` (never) matches neither bound. Use these for a fixed window the admin picked; use `expiringWithin` for anything that polls, since an absolute cutoff drifts out of date in the query string while a live table keeps re-sending it |
| `enabled` | products | `true｜false｜1｜0` |
| `expand` | products | CSV: `license`, `license.meterAttributes`, `license.featureEntitlements`, `license.metadata`, `metadata` — any `license.*` implies `license` |
| `expand` | floating-licenses | CSV: `metadata`, `meterAttributes`. Null means not expanded, `[]` means expanded and empty. `GET /floating-licenses/:id` returns both without asking — one row defers nothing |

**The "Applies to" column is enforced.** A parameter a collection does not accept
is a `400`, not an ignored parameter — `/floating-licenses?enabled=false` is
refused rather than answered with every lease. That covers unknown filters,
typos, and an `?expand=` value outside the five listed — including `meterAttributes`, which is real but belongs to the licence, so the name is `license.meterAttributes`. The error names what the
collection does accept.

**How filters combine: AND of ORs.** Two rules, and they cover everything the
filtering does:

- **Different parameters are ANDed.** `?status=expired&enabled=true` returns
  rows that are expired *and* enabled. Stacking parameters narrows the result.
- **CSV values within one parameter are ORed.** `?status=expired,suspended`
  returns rows in either state, matched case-insensitively. This is what a
  multi-select control maps onto — send the whole selection as one parameter.

Together: `?productId=a,b&status=expired,suspended` means
`productId IN (a,b) AND status IN (expired,suspended)`. There is no syntax for
anything else, and nothing to escape or quote — a value is a value.

**What the filtering deliberately does not do.** These are not gaps to work
around silently; if the dashboard needs one, ask and it gets added server-side.

| Not supported | Example of what you cannot ask for | Do this instead |
|---|---|---|
| OR across *different* fields | `status=expired OR enabled=false` | Two requests and union them, or filter the page client-side |
| Grouping / nesting | `(a OR b) AND NOT c` | Same — there is no expression language, and none is planned |
| Negation | `status!=ok` | Enumerate the complement: `?status=expired,suspended,grace_period_over,not_activated,disabled` |
| Ranges | `expiresAt < <unix>` | `sort=expiresAt` and read down the page, or compare client-side |

The negation workaround is brittle — it breaks quietly if a new status is ever
added — so prefer asking for a real filter over hardcoding a five-value list.

Five things to build against:

- **`total` is the count after filtering and before paging**, so "3 of 137" is honest.
- **On `/floating-licenses`, `total` is approximate.** The list is read from each product's repository in turn while the server's zombie sweeper expires leases concurrently, so the response is a smear across a few milliseconds rather than an atomic snapshot. A lease can appear on one page and be gone from the next, and `total` can disagree with what you count. Do not diff pages for correctness or treat `total` as exact; re-poll instead.
- **`items` is always an array**, never `null`, at any offset.
- **Malformed parameters are 400s**, so surface them rather than retrying — a typo in `sort` is a bug in your code, not a transient failure.
- **An empty value applies no filter.** `?status=` reads as "any status", so a cleared UI control can be sent as-is.
- **Expanded fields on `/products` are `null` when not requested and `[]` when requested and empty.** Those are different states; do not collapse them. The key is always present either way — see §A.1. A disabled product carries `null` for all of them, since it is not in the process and holds no licence.
- **`metadata` and `license.metadata` are different lists.** The first is the product's, the second the licence's; they come from two separate native calls. Asking for one does not give you the other. The product-scoped `GET .../server/metadata` returns both together as `{ license, product }` — that route is unchanged.

One fetch helper and one pagination component cover both collections.

**Not for the dashboard.** `POST`/`PUT`/`PATCH` on `floating-licenses` and `.../meter-attributes` are the client SDK's lease acquire/renew path. Their bodies are JWE-encrypted with the server's RSA key and they are rate- and time-validated. `DELETE` on a lease is the SDK's too — it is how a client hands its own seat back, and it is gated on the product's licence being valid. **The dashboard mutates no leases at all**; it is a read-only view of them. The legacy unversioned `/api/server/*` and `/api/floating-licenses*` routes are likewise off-limits.

---

## Appendix A — Data types

Authoritative shapes for every payload the dashboard touches, transcribed from the backend's own type definitions and verified by serialising them. Written as TypeScript so it can be pasted into a `types.ts` and narrowed from there.

**Read §A.4 before generating types from these** — several fields are `null` rather than absent or empty, and one is always `null`.

### A.1 Conventions

- Every `*At` field is **Unix epoch seconds** (`number`). `0` means unset — never a 1970 date. Multiply by 1000 for `new Date()`.
- `leaseDuration` and `maxOfflineLeaseDuration` are **seconds**.
- `-1` in a limit field means **unlimited**.
- Go `int64`/`uint64` become plain JS `number`. Safe in practice for epochs and counts, but `totalUses`/`grossUses` are `uint64` server-side and are not range-checked before serialisation — if you ever display a meter in the quintillions, that's why.
- No field is ever absent from a success payload. Go marshals zero values explicitly (`""`, `0`, `false`, `null`). The single exception is `code` on the error envelope, which uses `omitempty`. This holds for the `?expand=` fields too: unrequested ones are `null`, not missing — so a generated type can mark every field required.

### A.2 Auth and errors

```ts
// POST /api/login
interface LoginRequest  { username: string; password: string }
interface AccessTokenResponse { accessToken: string }   // JWT, HS256, exp = +1h

// Every non-2xx response, from the global Fiber error handler in main.go.
// `code` is omitted entirely when the server did not set one (typical for 401/404).
interface ApiError { code?: string; message: string }
```

### A.3 Domain types

```ts
type LicenseStatus =
  | 'ok'
  | 'not_activated'
  | 'expired'
  | 'suspended'
  | 'grace_period_over';

// Only 'per-instance' is special-cased by the server; any other value is passed
// through verbatim from LexActivator. Treat as an opaque string, not a closed union.
// Deliberately returned as '' when status === 'not_activated'.
type LeasingStrategy = 'per-instance' | (string & {});

interface Metadata       { key: string; value: string }
interface MeterAttribute { name: string; uses: number }

// GET /api/v4/server/stats
interface ServerStatsV4 {
  version: string;                      // LFS build version, e.g. "4.23.0"
  productCount: number;
  totalFloatingClients: number;         // summed across all products
  totalOfflineFloatingClients: number;
  // No `status` field. Liveness is the 200.
}

// GET 🔒 /api/v4/server/config   —  read-only view of config.yml (§11.1)
interface ServerConfigV4 {
  server: {
    port: number;
    enableIpv6: boolean;
    cryptlexHost: string;               // '' unless overridden
    blockedIps: string[];               // [] not null
    allowedClockOffset: number;         // seconds
    leaseDurationGracePeriod: number;   // seconds
  };
  ssl: { enabled: boolean };            // cert paths are not reported
  proxy: { trustedProxies: string[] };  // [] not null
  auth: {
    apiKeyConfigured: boolean;          // the key itself is never exposed
    admins: string[];                   // usernames only; [] not null
  };
  logging: {
    logLevel: number;                   // 0 Debug · 1 Info · 2 Warning · 3 Error
    console: { enabled: boolean; noColor: boolean };
    file: { enabled: boolean; directory: string; maxSize: number; maxBackups: number };
  };
  productDefaults: {                    // what a product with no overrides inherits
    leaseDuration: number;
    maxOfflineLeaseDuration: number;
    allowedOfflineFloatingClients: number;
  };
}

// Every collection response. Total is post-filter, pre-page.
interface Page<T> { items: T[]; total: number; limit: number; offset: number }

// GET 🔒 /api/v4/products  →  Page<Product>
interface Product {
  id: string;                           // productId GUID. A key, not a label:
                                        //   use it for routes and ?productId=.
                                        //   Render displayName instead.
  displayName: string;                  // never empty. A real name if the product file
                                        //   ever carries one; otherwise a stable label
                                        //   derived from the id, e.g. "product-17c472b4"
  enabled: boolean;                     // false = declared in config.yml but not loaded
  status: LicenseStatus | 'disabled';   // 'disabled' iff enabled === false
  totalFloatingClients: number;         // 0 on a disabled product
  totalOfflineFloatingClients: number;
  allowedFloatingClients: number;       // seat limit; 0 when not activated
  expiresAt: number;                    // 0 when not activated
  serverSyncGracePeriodExpiresAt: number;  // non-zero = lost contact with Cryptlex

  // null unless requested via ?expand=. null ≠ empty: an expanded field
  // with nothing in it is [], and that is a different fact. A disabled product
  // carries none of them — it is not in the process, so it holds no licence.
  license: ProductLicense | null;       // ?expand=license; null = not requested
  metadata: Metadata[] | null;          // ?expand=metadata — the PRODUCT's metadata.
                                        // The licence's is license.metadata: two
                                        // native calls, two owners, two expansions.
}

// ?expand=license. The licence-info body plus the licence's own sub-resources —
// they nest here rather than beside `license` on the product row, because they
// are properties of the licence. Any license.* expansion implies this one.
// null = not requested, [] = requested and empty. Never absent.
interface ProductLicense extends ProductLicenseInfo {
  meterAttributes:     LicenseMeterAttribute[] | null;  // ?expand=license.meterAttributes
  featureEntitlements: FeatureEntitlement[] | null;     // ?expand=license.featureEntitlements
  metadata:            Metadata[] | null;               // ?expand=license.metadata
}

// The plan/tier the licence sits on. NOT a product name — two products on the
// same plan report the same set.
interface LicenseEntitlementSet {
  name: string;
  displayName: string;
  tier: number;
}

// GET 🔒 /api/v4/products/:productId/server/metadata  →  ProductMetadata
// Both lists are always present; [] when the licence or product carries none.
interface ProductMetadata {
  license: Metadata[];                  // what the vendor stamped on this licence
  product: Metadata[];                  // what the vendor stamped on the product
}

// GET /api/v4/products/:productId/server/stats
interface ProductStats {
  productId: string;
  totalFloatingClients: number;
  totalOfflineFloatingClients: number;
}

// GET /api/v4/products/:productId/server/config   (not auth-protected)
interface ProductConfig {
  leaseDuration: number;                // seconds
  maxOfflineLeaseDuration: number;      // seconds
  allowedOfflineFloatingClients: number;
}

interface ServerActivationMode {
  initial: string;                      // opaque LexActivator string; '' before activation
  current: string;
}

interface ServerLicenseUser {
  name: string; email: string; company: string;
}

interface ServerLicenseOrganizationAddress {
  addressLine1: string; addressLine2: string;
  city: string; state: string; country: string; postalCode: string;
}

interface ServerLicenseOrganization {
  name: string;
  address: ServerLicenseOrganizationAddress;   // always present when org is non-null
}

// GET 🔒 /api/v4/products/:productId/server/license-info, and the base of
// ProductLicense above — so one parser covers both. There is no
// /api/v4/licenses: a product holds exactly one licence, so a collection of
// licences would be the product collection turned inside out.
interface ProductLicenseInfo {
  key: string;                          // full license key — mask in UI
  allowedFloatingClients: number;       // seat limit; also on the /products row
  createdAt: number;
  activatedAt: number;
  expiresAt: number;
  serverSyncGracePeriodExpiresAt: number;  // non-zero ⇒ urgent, see §8.1
  activationMode: ServerActivationMode;
  user: ServerLicenseUser | null;             // null when the license has no user
  organization: ServerLicenseOrganization | null;
  status: LicenseStatus;
  leasingStrategy: LeasingStrategy;
  // null when the licence grants no entitlement set, and always null when
  // status === 'not_activated'.
  entitlementSet: LicenseEntitlementSet | null;
}

// GET /api/v4/products/:productId/server/license-meter-attributes  →  LicenseMeterAttribute[]
interface LicenseMeterAttribute {
  id: string;
  name: string;
  allowedUses: number;                  // -1 ⇒ unlimited
  totalUses: number;                    // uint64
  grossUses: number;                    // uint64
  floating: boolean;                    // true ⇒ totalUses is "in use now" and can fall;
                                        //   false ⇒ accumulated consumption. See §8.3.
}

// GET /api/v4/products/:productId/server/feature-entitlements  →  FeatureEntitlement[]
interface FeatureEntitlement {
  featureName: string;                  // machine name
  featureDisplayName: string;           // prefer this; fall back to featureName if ''
  value: string;                        // always a string, even for booleans/numbers
  baseValue: string;
  expiresAt: number;                    // 0 ⇒ does not expire
}

// GET 🔒 /api/v4/floating-licenses      →  Page<FloatingLicense>
// GET 🔒 /api/v4/floating-licenses/:id  →  FloatingLicense, metadata and
//                                          meterAttributes always populated
interface FloatingLicense {
  id: string;                           // globally unique UUIDv4; row key and client-detail
                                        // lookup. NOT for display — see §9.
  productId: string;                    // present on every lease, flat and scoped routes alike
  productDisplayName: string;           // the same label /products reports, never empty.
                                        //   Render this, not productId — see §9.
  ip: string;
  os: string;
  osVersion: string;
  hostname: string;
  username: string;                     // OS account name the client reports, in the clear.
                                        // "" when the client does not report one, so expect
                                        // blanks from older clients. NOT an authenticated
                                        // identity — do not present it as a verified user.
                                        // This is the identity field to display. There is no
                                        // userHash field: the server holds one and does not
                                        // serialise it — see §9.
  offline: boolean;
  clientVersion: string;                // LexFloatClient SDK version
  createdAt: number;                    // lease first acquired
  updatedAt: number;                    // last renewal — the liveness signal
  expiresAt: number;
  metadata: Metadata[] | null;          // null unless ?expand=metadata (the detail
                                        // route always sends it); [] when expanded
                                        // and the client sent none
  meterAttributes: MeterAttribute[] | null;   // this lease's own uses. null unless
                                        // ?expand=meterAttributes; the detail route
                                        // always sends it. License-wide totals are a
                                        // separate figure — /products?expand=license
                                        // .meterAttributes — and remain authoritative.
  // Not exposed by decision: fingerprint. Not exposed yet: effective lease
  // duration and host entitlement set.
}
```

### A.4 Nullability — the part that breaks generated types

Go marshals a nil slice as `null`, not `[]`. Whether a given array field arrives as `[]` or `null` therefore depends on how the backend happens to build it, and it is **not** consistent across endpoints. Verified by marshalling:

| Field | Empty value on the wire | Why |
|---|---|---|
| `GET /products` → body | `[]` | built with `make([]Product, 0, n)` |
| `GET .../floating-licenses` → body | `[]` | initialised to `[]dtos.FloatingLicense{}` |
| `GET .../license-meter-attributes` → body | `[]` | initialised to `[]dtos.LicenseMeterAttribute{}` |
| `GET .../feature-entitlements` → body | `[]` | explicit empty-slice return |
| `FloatingLicense.metadata` | **`null`** unexpanded, `[]` expanded-and-empty | only built when `?expand=metadata` asks for it |
| `FloatingLicense.meterAttributes` | **`null`** unexpanded, `[]` expanded-and-empty | same; `GET /floating-licenses/:id` populates both unasked |
| `ProductLicenseInfo.user` | **`null`** | pointer, nil unless the license carries a user name |
| `ProductLicenseInfo.organization` | **`null`** | pointer, nil unless the license carries an org name |

So: top-level array responses are safe to treat as arrays, but **`metadata` must be handled as nullable** (`fl.metadata ?? []`) and `user` / `organization` must be null-checked before rendering their blocks. Don't let a codegen tool infer these as non-nullable from a single sample response — a license with a user and a client with metadata will both look non-null.

The `null`-vs-`[]` inconsistency is ours to clean up; treat the table above as current reality rather than intended design, and code defensively.

### A.5 Activation and deactivation payloads

```ts
// POST .../server/activate
// POST .../server/offline-activation-request
interface ServerLicenseActivationRequest {
  licenseKey: string;
  metadata?: Metadata[];                // optional activation metadata
}

// POST .../server/deactivate
// POST .../server/offline-deactivate
interface ServerLicenseDeactivationRequest { licenseKey: string }

// POST .../server/offline-activate
interface ServerOfflineLicenseActivationRequest {
  licenseKey: string;
  offlineResponse: string;              // full text of the .offres file from the portal
}

// Success envelope for activate / offline-activate / deactivate.
// e.g. { code: 'SERVER_LICENSE_ACTIVATED', message: 'Server license activation successful!' }
interface Result { code: string; message: string }

// POST .../server/offline-activation-request   → offer as a .offreq download
interface ServerOfflineActivationRequestResponse { offlineRequest: string }

// POST .../server/offline-deactivate           → offer as a .offreq download
// NOTE: the license is already deactivated locally when this returns.
interface ServerOfflineDeactivationRequestResponse { offlineRequest: string }
```

### A.6 Types the dashboard does not need

The backend also defines `ServerStats`, `ServerConfig`, `ServerLicenseInfo`, `FloatingLicenseActivation`, `FeatureFlag`, and `ServerHello`. These belong to the legacy unversioned API and the client-SDK lease protocol. `FloatingLicenseActivation` in particular is large and carries deprecated fields (`productVersionName`, `hostLicenseFeatureFlags`) — it is the SDK's response type, never a dashboard one. Ignore all of them. If we ever hand you a generated schema rather than this appendix, filter it to the types in §A.2–A.5