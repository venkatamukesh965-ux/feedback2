# Feedback Intelligence — React + Tailwind frontend

This version keeps the existing Flask analysis engine and PDF API, but replaces the old UI with a **React + Tailwind CSS** application.

## Frontend stack
- React
- Vite
- Tailwind CSS v4
- Recharts
- Lucide React

There is **no vanilla HTML UI and no custom CSS design system**. The Vite `index.html` is only the required application entry point; all visible UI is rendered by React components and styled with Tailwind utility classes. `src/index.css` only imports Tailwind.

## Existing backend flow preserved
- `POST /api/analyze` — XML, CSV, JSON, TSV, TXT analysis
- `POST /api/report` — downloadable PDF report
- Existing deterministic analysis engine remains in `app.py`

## Run on Windows
Install Python 3 and Node.js 18+.

Double-click `run.bat`, or:

```powershell
python -m pip install -r requirements.txt
cd frontend
npm install
npm run build
cd ..
python app.py
```

Then open `http://127.0.0.1:5050`.

## Development mode
Run Flask on port 5050 and Vite separately. For a production-style local run, use `npm run build` so Flask serves `frontend/dist`.

## UI
The React dashboard includes:
- Animated drag/drop upload
- KPI cards
- Issue-rate visualization
- Sentiment donut chart
- Recurring issue topics
- Issue-category chart
- Monthly feedback trend
- Duplicate and reworded-repeat feedback
- Positive highlights
- Search/filterable record table
- PDF report export
- Responsive layout and 2D micro-interactions
