# Security hardening notes

## Clickjacking / frame defence

If Runbox 7 is served without `Content-Security-Policy: frame-ancestors` and
`X-Frame-Options` response headers, a third-party page can load it in an
iframe and overlay it, tricking a logged-in user into clicking sensitive
controls they cannot see (clickjacking / UI redress).

### Authoritative control — set these at the server / edge

    Content-Security-Policy: frame-ancestors 'none'      # or 'self'
    X-Frame-Options: DENY                                # legacy fallback

`frame-ancestors` is the modern control; `X-Frame-Options` covers older
browsers. These MUST be response headers — `frame-ancestors` in a
`<meta http-equiv>` tag is ignored by browsers.

### Defence-in-depth — client-side guard (shipped)

`FrameDefenseGuard` (Angular `CanActivate`, backed by `FrameBustingService`)
is applied to the authenticated `/calendar` and `/contacts` routes. When
`window.self !== window.top` it refuses to activate the route, so those flows
are not rendered inside a frame.

It is intentionally scoped to those routes rather than applied globally
(e.g. via `APP_INITIALIZER`): a global break-out / `display:none` would break
any legitimate full-app embedding. Maintainers can extend
`canActivate: [FrameDefenseGuard]` to other sensitive routes as desired. This
client guard reduces risk when the headers above are absent but does not
replace them.

### CSP via meta (shipped)

`src/index.html` sets `object-src 'none'; base-uri 'self'` — both honoured in
`<meta>` and safe for this app. Tighter script/connect policies should be
delivered as tested response headers at the edge, not via meta.
