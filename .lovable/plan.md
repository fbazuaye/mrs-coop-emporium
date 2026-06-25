# Fix High-Severity Dependency Vulnerabilities

## Issue
`@tanstack/react-start@1.167.50` pulls in a vulnerable version of `undici` with three high-severity advisories (TLS bypass, WebSocket DoS, SOCKS5 proxy pool reuse).

## Plan
1. Run `bun update @tanstack/react-start` to pull the latest patched release (which bumps the transitive `undici`).
2. If the transitive `undici` is still flagged, add a `resolutions`/`overrides` entry in `package.json` pinning `undici` to a patched version (>=6.21.2 / >=7.x as advised).
3. Run `bun install` and verify the dev server still boots and the build passes.
4. Re-run the security scan and mark `vulnerable_dependencies_high` as fixed via `manage_security_finding`.

## Notes
- These are server/build-time deps; no app code changes expected.
- Will not touch the other (medium) finding unless you ask.
