# Render deployment and HTML API errors

## Startup recovery verified on 16 November 2026

The deployed Vercel `/api/health` route initially returned HTTP 502 with
`X-Render-Routing: no-deploy`. A simultaneous direct Render health request
completed successfully after 23.7 seconds. Subsequent checks returned JSON
HTTP 200 in 0.27 seconds directly and 0.37 seconds through Vercel, with the
database connected and recent process uptime. This establishes a temporary
backend startup/routing failure; it does not establish whether the process
was waking from idle or restarting during a deployment. Render's free-service
[idle startup behavior](https://render.com/docs/free#spinning-down-on-idle)
is consistent with these observations. The frontend's one-shot error handling
made that temporary failure appear permanent until another user action.

The API client now retries GET requests on HTTP 502, 503 and 504, using
1, 2, 4, then at most 8 seconds between attempts. Recovery is capped at
10 attempts and a 60-second deadline. Retry-After is respected; if its delay
would exceed the remaining budget, the error is returned. A selected-location
change cancels in-flight work and retry delays. Environmental panels display
an automatic startup-retry message while waiting. Successful cached data stays
available. Requests can opt out with `{ retryStartup: false }`.

POST, PUT, PATCH and DELETE requests are never automatically replayed. HTTP
401, 403, 404 and 429 are not retried, nor are ordinary network/CORS failures.
A permanently unavailable service still produces a bounded error instead of
an infinite loading state. This handles transient startup failures; it does
not prevent the hosting platform from stopping or restarting a service.

After startup, the deployed environmental endpoint returned HTTP 200 in
3.24 seconds at latitude 30.6945, longitude 76.8357: MET Norway forecast
temperature 24.3 C and humidity 44.5%, plus SoilGrids regional pH 6.3 sampled
10.1 km north. These were real production responses, not mocked values.
Code changes remain local until redeployed; the observed live recovery came
from the backend becoming available during investigation.

The frontend expects JSON from `/api/v1/*`. An error beginning with
`<!DOCTYPE html>` means a request received a web page instead. Check the
request URL, HTTP status, and response in the browser's Network panel.
HTML alone does not establish whether the cause is a wrong URL, a rewrite,
or an unavailable backend.

## This project's Vercel frontend

The checked-in `frontend/vercel.json` forwards `/api/*` to
`https://ecorevive-api.onrender.com/api/*`. With this configuration, relative
API requests are supported in production. Keep the backend hostname in that
rewrite synchronized with the actual Render service URL. If this route returns
JSON successfully, changing the routing is unnecessary; investigate transient
hosting failures when HTML appears intermittently.

## Separately hosted frontend and backend

On the frontend hosting service, set these environment variables before building:

```env
VITE_API_BASE_URL=https://YOUR-BACKEND.onrender.com/api/v1
VITE_USE_PROXY=false
```

Use the real backend's public HTTPS hostname. `VITE_API_BASE_URL` takes
precedence over `VITE_API_URL`. Remove stale values pointing to localhost
or the frontend hostname. Vite embeds these values at build time, so rebuild
and redeploy the frontend after changing them.

The development proxy in `frontend/vite.config.js` only runs during local
development. `frontend/vercel.json` configures Vercel; Render does not use
that file. On a Render static site, a `/*` -> `/index.html` rewrite supports
React Router routes, but does not forward API traffic to the backend.
Use the absolute backend URL above when hosting the services separately.

For a Render static frontend with root directory `frontend`, use build command
`npm ci && npm run build` and publish directory `dist`.

On the backend service, use root directory `backend`, build command `npm ci`,
and start command `npm start`. Set `CORS_ORIGIN` to the frontend's exact HTTPS
origin (no route path), plus the existing required database and JWT settings.
Set `APP_URL` to the frontend origin for public tree links.

## Verify the backend

Open `https://YOUR-BACKEND.onrender.com/api/health`, then
`https://YOUR-BACKEND.onrender.com/api/v1/environment?lat=30.65&lng=76.78`.
Both should return JSON. If either returns a hosting error page, inspect the
backend's Render deploy/runtime logs and service status. If the backend URL
works directly but browser requests fail, inspect the frontend API URL,
rewrite rules, and backend CORS configuration.

The API client rejects HTML, including HTTP 200 SPA fallback pages, and shows
a short error instead of printing the document into the layout. This prevents
the display issue; restoring API data still requires the correct routing and
a running backend.

References: [Render environment variables](https://render.com/docs/configure-environment-variables),
[Render static sites](https://render.com/docs/static-sites),
[Vite environment variables](https://vite.dev/guide/env-and-mode).
