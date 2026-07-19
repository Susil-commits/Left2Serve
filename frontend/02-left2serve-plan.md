# Left2Serve — Lighthouse 90+ Remediation Plan
**URL:** https://left2-serve.vercel.app/
**Current state:** BROKEN — `NO_FCP` (page never paints). All categories score 0/6. Identical failure mode to FaRm. Fix Phase 1 before anything else matters.

---

## Phase 1 — Get the app to actually render (blocking, do first)

1. **Reproduce and diagnose**
   - Open the live URL in an incognito tab, DevTools open, hard refresh.
   - Record: Console errors, Network tab failures (especially API calls to your backend), whether anything flashes before going blank.

2. **Check environment variables**
   - Compare local `.env` against Vercel dashboard env vars for this project specifically (each Vercel project has its own set — don't assume it matches FaRm's).
   - Confirm API base URL variable points to the live backend, not `localhost`.
   - Redeploy after changes.

3. **Check backend availability**
   - Confirm the backend service is running, not crashed, not sleeping (cold-start delay on free hosting tiers is a common cause of `NO_FCP` if the frontend blocks render on the first API response).

4. **Add a render-first loading state**
   - Top-level layout/shell should render immediately regardless of data-fetch state.
   - Guard against undefined data crashing the render tree on mount (e.g. `items?.map(...)` with a fallback empty array, not `items.map(...)` assuming it's always populated).

5. **Verify build output**
   - Confirm the Vercel build settings (framework preset, build command, output directory) match what the project actually is.

**Exit criteria for Phase 1:** loading the URL in a fresh browser shows visible content within ~2-3 seconds, with no console errors.

---

## Phase 2 — Performance (target 90+)
- Code-split routes with `React.lazy()` + `Suspense`.
- Check `npm run build` output size; trim unused dependencies; use targeted imports over whole-library imports.
- Add explicit `width`/`height` or `aspect-ratio` to all images to prevent layout shift; lazy-load offscreen images.
- Use `font-display: swap` and preload critical fonts only.
- Verify production build is minified (default in most CRA/Vite setups — confirm it's not accidentally serving a dev build).
- Look for expensive synchronous work on mount (unbounded loops, heavy computed state) and move it to `useMemo`/`useEffect` where appropriate.

## Phase 3 — Accessibility (target 90+)
- `alt` text on all images.
- Labels associated with all form inputs (this matters a lot if Left2Serve has forms for service requests/bookings).
- Correct heading hierarchy, no skipped levels.
- `lang` attribute on `<html>`.
- Fix color contrast on text/background pairs — check against WCAG AA (4.5:1).
- Keyboard focusability and visible focus states on all buttons/links/custom controls.
- Prefer semantic HTML (`<button>`, `<nav>`, `<main>`) over generic `<div>` + ARIA where possible.

## Phase 4 — Best Practices (target 90+)
- HTTPS enforced, no mixed content.
- Add CSP header if missing.
- Zero console errors/warnings on load.
- Remove deprecated API usage flagged by Lighthouse.
- Enable production source maps for maintainability.

## Phase 5 — SEO (target 90+)
- Unique `<title>` + `<meta name="description">` per route.
- Valid `robots.txt` served correctly at root.
- All navigation uses real `<a href>` links (crawlable), not JS-only click handlers.
- `rel="canonical"` tags.
- Confirm proper HTTP status codes on all routes (no soft-404s from client-side routing).

## Phase 6 — Agentic Browsing (bonus, lower priority)
- CLS fix (comes from Phase 2 image/font work).
- Add `llms.txt` at root.
- Well-formed accessibility tree (comes from Phase 3 semantic HTML work).

---

## Instruction block to hand to your coding agent
> "Audit the Left2Serve codebase. First priority: the deployed app at https://left2-serve.vercel.app/ shows a blank page with Lighthouse NO_FCP error — find and fix why the app fails to render in production (check env vars, API connectivity, top-level render-blocking errors, add loading fallbacks). Once confirmed rendering, work through Phases 2-6 above in order, re-running Lighthouse after each phase, until all categories score 90+."
