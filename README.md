# EnergiSight Frontend

Next.js frontend for the Phase 2 Energy/CO2 prediction API.

## Environment Variable

Create `.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=https://<your-hf-space>.hf.space
```

## Local Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Deploy (Vercel)

1. Import this repo in Vercel.
2. Add `NEXT_PUBLIC_API_BASE_URL` in Vercel Project Settings -> Environment Variables.
3. Redeploy.

## API Endpoints Used

- `GET /sample-input`
- `POST /predict/both`
