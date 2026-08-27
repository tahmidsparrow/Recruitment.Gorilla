# Recruitment.Gorilla — Frontend

React 18 + TypeScript frontend built with Vite.

## Stack
- React 18 + TypeScript
- Bootstrap 5 + React Bootstrap
- TanStack Query v5 (data fetching)
- Axios (HTTP client)
- react-dropzone (file upload)
- react-router-dom (routing)

## Development

```bash
npm install
npm run dev       # starts dev server at http://localhost:5173
npm run build     # production build
npm run preview   # preview production build locally
```

The frontend expects the backend API to be running at `http://localhost:5000`.
The browser always calls the same-origin path `/api`; the Vite dev server proxies
that to the backend (see `vite.config.ts`).

If your backend listens on a different port, **don't edit `vite.config.ts`** —
create `client/.env.development.local` (gitignored) with:

```
VITE_API_PROXY_TARGET=http://localhost:5099
```

Keep the target on `localhost`/`127.0.0.1`: the proxy is what keeps the backend
off the LAN while the dev server itself is exposed.
