# AGENTS

This repository contains a React/Vite frontend and an Express/MongoDB backend.

## Project structure

- `frontend/` — React app built with Vite and Tailwind CSS.
- `backend/` — Express REST API using Mongoose and MongoDB.

## Primary tasks

- Frontend build: `cd frontend && npm install && npm run build`
- Frontend dev: `cd frontend && npm install && npm run dev`
- Backend dev: `cd backend && npm install && npm run dev`
- Backend start: `cd backend && npm install && npm start`

## Important notes for agents

- The repo is not a monorepo root for `npm` commands; the frontend and backend each have their own `package.json`.
- Backend uses `backend/server.js` as the entrypoint and loads `backend/config/database.js`.
- Backend requires `MONGODB_URI` in environment variables for deployment and local startup.
- Frontend reads API base URLs from `import.meta.env.VITE_API_URL` and backend uses `process.env.FRONTEND_URL` for CORS.
- File path casing matters in the frontend build on Linux-based CI/CD.

## Deployment and runtime

- Backend is deployed as a Node web service and must bind to `process.env.PORT`.
- MongoDB Atlas network access or IP allowlist must permit the deployed backend host.

## When editing code

- Preserve the frontend/backend separation.
- Use relative imports carefully in React components and maintain case-sensitive file names.
- Prefer updating environment variables in deployment settings rather than hardcoding secrets in code.

## References

- Frontend docs: `frontend/README.md`
