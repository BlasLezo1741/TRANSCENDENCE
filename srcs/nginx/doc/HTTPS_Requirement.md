# Security Requirement: HTTPS Everywhere

## Requirement

> **All backend communication must take place exclusively over HTTPS. Plain HTTP connections must never reach backend services.**

---

## Rationale

Transmitting data over unencrypted HTTP exposes API tokens, user credentials, session cookies, and WebSocket frames to network interception. The project handles authentication (JWT, OAuth via 42/Google), real-time game state, and private chat messages — all of which require transport-layer confidentiality and integrity guarantees.

---

## Implementation

The requirement is enforced at the **Nginx reverse-proxy layer**, which acts as the single point of ingress for all external traffic.

### 1. HTTP → HTTPS Redirect (port 8080 → 8443)

Any request arriving on port 80 (mapped externally to `8080`) is immediately redirected with a **301 Permanent Redirect** before it can touch any backend service:

```nginx
server {
    listen 80;
    server_name localhost;
    return 301 https://$host:8443$request_uri;
}
```

No HTTP request ever reaches the NestJS backend, the frontend, or any monitoring tool.

### 2. HTTPS-Only Listener (port 443 / 8443)

The sole entry point for all accepted traffic is the TLS server block:

```nginx
server {
    listen 443 ssl;
    ssl_certificate     /etc/nginx/ssl/nginx.crt;
    ssl_certificate_key /etc/nginx/ssl/nginx.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ...
}
```

Only **TLS 1.2 and TLS 1.3** are permitted; older, insecure protocol versions are explicitly excluded.

### 3. Security Headers

Every HTTPS response carries the following headers to harden transport security:

| Header | Value | Purpose |
|---|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Forces browsers to use HTTPS for 1 year |
| `X-Frame-Options` | `SAMEORIGIN` | Prevents clickjacking |
| `X-XSS-Protection` | `1; mode=block` | Enables browser XSS filtering |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME-type sniffing |

The HSTS header is the most critical: once a browser sees it, it will refuse to connect over plain HTTP for the entire duration of `max-age`.

### 4. Location Blocks — Routing Rules Inside the HTTPS Listener

Once a request has passed TLS negotiation, Nginx matches its URL path against a series of `location` blocks to decide which internal service should handle it. All of these routes live exclusively inside the `listen 443 ssl` server block, meaning **routing only happens after the TLS handshake is complete** — an unencrypted request never reaches this decision point.

Nginx evaluates `location` blocks in a specific priority order: exact matches (`=`) come first, then prefix matches with the `^~` modifier, then regular expressions (`~` or `~*`), and finally plain prefix matches. Understanding this order is important to predict which rule wins when a URL could match more than one block.

#### A) Frontend — `location /`

```nginx
location / {
    proxy_pass http://frontend:5173;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
    ...
}
```

This is the **catch-all** block. Any request that does not match a more specific rule below falls through here and is forwarded to the React/Vite container on port `5173`. The `Upgrade` and `Connection` headers are included to support Vite's Hot Module Replacement (HMR) WebSocket connection during development.

#### B) Backend REST API — `location /api/`

```nginx
location /api/ {
    rewrite ^/api/(.*)$ /$1 break;
    proxy_pass http://backend:3000;
    ...
}
```

Requests whose path starts with `/api/` are routed to the NestJS backend on port `3000`. The `rewrite` directive strips the `/api` prefix before forwarding, so a client calling `https://localhost:8443/api/users/me` is received by NestJS simply as `GET /users/me`. This keeps the frontend routing namespace cleanly separated from the backend's own route definitions.

#### C) Backend Direct Routes + WebSockets — `location ~ ^/(auth|users|friends|chat|game|match|countries|profile|socket.io)`

```nginx
location ~ ^/(auth|users|friends|chat|game|match|countries|profile|socket\.io) {
    proxy_pass http://backend:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
    ...
}
```

This block uses a **regular expression** (`~`) to match any path that starts with one of the listed prefixes. It serves two roles simultaneously:

- **Direct API routes**: Paths like `/auth/login`, `/friends`, or `/profile` are forwarded to the NestJS backend without any prefix rewriting. The frontend calls these URLs directly rather than going through `/api/`.
- **WebSocket upgrade**: The `Upgrade` and `Connection` headers enable the HTTP → WebSocket protocol upgrade required by Socket.io, which is used for real-time chat and Pong game communication. Without `proxy_http_version 1.1` and these headers, WebSocket connections would be rejected mid-handshake.

Because this is a regex location, it takes **precedence over the plain prefix `location /`** block, ensuring that WebSocket connections to `/socket.io` are handled by the backend rather than accidentally forwarded to the frontend.

#### D) Adminer — `location /adminer/`

```nginx
location /adminer/ {
    proxy_pass http://adminer:8080/;
    ...
}
```

Routes database management UI traffic to the Adminer container. The trailing slash on both the `location` path and the `proxy_pass` URL is deliberate: Nginx rewrites the path so that `/adminer/` becomes `/` when forwarded to Adminer, making the tool unaware that it is being served under a sub-path. Access-control rules (`allow`/`deny`) are present but commented out — see Open Points below.

#### E) Grafana — `location /grafana/`

```nginx
location /grafana/ {
    proxy_pass http://grafana:3500;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
    ...
}
```

Routes monitoring dashboard traffic to Grafana on port `3500`. The WebSocket headers are required because Grafana uses a persistent WebSocket connection to push live dashboard updates to the browser without the page needing to poll.

#### F) Prometheus — `location /prometheus/`

```nginx
location /prometheus/ {
    proxy_pass http://prometheus:9090/;
    ...
}
```

Exposes the raw Prometheus metrics UI under `/prometheus/`. Like Adminer, the trailing-slash trick strips the sub-path prefix before forwarding. No WebSocket upgrade is needed here since Prometheus serves a standard HTTP interface.

#### Routing Summary

| Location | Match Type | Target Container | Port | WebSocket |
|---|---|---|---|---|
| `/` | Plain prefix (catch-all) | `frontend` | 5173 | ✅ (Vite HMR) |
| `/api/` | Plain prefix | `backend` | 3000 | — |
| `~^/(auth\|users\|…\|socket.io)` | Regex | `backend` | 3000 | ✅ (Socket.io) |
| `/adminer/` | Plain prefix | `adminer` | 8080 | — |
| `/grafana/` | Plain prefix | `grafana` | 3500 | ✅ (Live UI) |
| `/prometheus/` | Plain prefix | `prometheus` | 9090 | — |

### 5. Internal Proxy Traffic

All traffic from Nginx to internal containers (backend, frontend, Grafana, Prometheus, Adminer) flows over Docker's internal network (`transcendence_net`) using plain HTTP. This is acceptable because:

- The internal network is not reachable from outside the Docker host.
- TLS termination at the proxy boundary is a standard and well-established pattern.
- The `X-Forwarded-Proto: $scheme` header is forwarded to all backends so they remain aware that the original client connection was HTTPS.

### 6. Exposed Ports

As defined in `docker-compose-nginx.yml`:

```yaml
ports:
  - "8080:80"   # HTTP, used only to issue the 301 redirect
  - "8443:443"  # HTTPS — the only port through which real traffic flows
```

No other container exposes ports directly to the host, ensuring that all external traffic is funnelled through the Nginx TLS gateway.

### 7. Error Page 497 — Internal HTTP-to-HTTPS Catch

Nginx issues error `497` when an HTTP request is made directly to an HTTPS listener. The configuration catches this and performs an additional redirect:

```nginx
error_page 497 =301 https://$host:8443$request_uri;
```

This is a defence-in-depth measure: even if a client somehow reaches port 443 without TLS, it is redirected rather than served.

---

## Compliance Checklist

- [x] Port 80 / 8080 performs a `301` redirect to HTTPS — no content served over HTTP.
- [x] TLS 1.0 and TLS 1.1 are disabled; only TLS 1.2 and 1.3 are allowed.
- [x] SSL certificates are provisioned inside the Nginx container at build time.
- [x] `Strict-Transport-Security` header is sent on every response.
- [x] No backend container exposes ports directly to the host.
- [x] `X-Forwarded-Proto` is propagated so backend services know the connection originated as HTTPS.

---

## Open Points / Recommendations

- **Self-signed vs. trusted certificate**: The current setup uses a self-signed certificate generated in the Dockerfile (`nginx.crt` / `nginx.key`). For a production or evaluation environment accessible over the public internet, this should be replaced with a certificate from a trusted CA (e.g. Let's Encrypt / Certbot).
- **Adminer / Prometheus access controls**: The IP-based `allow`/`deny` rules are currently commented out. These should be enabled before any public-facing deployment to prevent exposure of database and metrics interfaces.
- **HSTS preloading**: For even stronger enforcement, the `preload` directive can be added to the HSTS header and the domain submitted to browser preload lists.
