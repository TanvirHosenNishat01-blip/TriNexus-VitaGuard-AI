# TriNexus · VitaGuard AI frontend

React + Vite frontend for **both diabetes and cardiovascular prediction**. Built directly in the supplied working tree. Backend code, requirements, data, model artifacts and root configuration were not edited.

## Windows VS Code terminal commands

Prerequisite: Node.js 22.12+ (verified using Node 24.19.0 and npm 11.17.0).

Terminal 1, PowerShell:

```powershell
Set-Location 'D:\GitHubProject\TriNexus\frontend'
npm ci
npm run dev
```

Open **http://localhost:5173**. Vite uses port 5173 with strictPort; it fails if the port is occupied instead of switching ports. Stop an existing dev server with Ctrl+C before starting another.

Run tests/build from a second frontend terminal:

```powershell
Set-Location 'D:\GitHubProject\TriNexus\frontend'
npm test
npm run build
npm run preview
```

Preview uses http://localhost:4173. It serves the production files; it does **not** provide the development API proxy. Use a configured backend origin with CORS for this origin, or a reverse proxy.

## API configuration

The default empty `VITE_API_BASE_URL` uses relative `/api` requests. The Vite **development** server forwards them to http://127.0.0.1:8000.

Optional direct-origin development setup:

```powershell
Set-Location 'D:\GitHubProject\TriNexus\frontend'
Copy-Item .env.example .env.local
# Edit .env.local: VITE_API_BASE_URL=http://127.0.0.1:8000
npm run dev
```

Use only an HTTP(S) **origin**, without `/api`, credentials, query string or path. Restart Vite after changing environment variables. Production variables are embedded at build time: set the variable before `npm run build` and rebuild when it changes. Never put secrets in VITE variables.

For deployment:

- Serve `dist/` and configure an SPA fallback to `index.html` for the frontend routes.
- Either reverse-proxy `/api/*` to an accessible backend while preserving the path, or build with `VITE_API_BASE_URL=https://your-backend-host`.
- A direct cross-origin backend must allow the deployed frontend origin through CORS. The supplied backend permits only http://localhost:5173 and http://localhost:3000.
- A deployed browser cannot reach your development machine via its own 127.0.0.1. HTTPS frontends need HTTPS backends.
- Google Fonts is used for typography with system sans-serif fallbacks if unavailable.

## Routes

| Route | Purpose |
| --- | --- |
| / | Overview and both assessment entry cards |
| /dashboard | Both assessment entries; honest history availability notice |
| /predict/diabetes | Eight-field diabetes assessment |
| /predict/cardio | Thirteen-field cardiovascular assessment |
| /awareness | Interpretation, data handling and global diabetes importance |

Both prediction routes are public. Empty Login/Register/AuthContext/ProtectedRoute files remain unconnected. Existing empty locale files and i18n scaffold are preserved; no supplied translated design content existed. The delivered interface is English.

## Verified source contracts and behavior

- Diabetes: POST `/api/predict` with exactly Pregnancies, Glucose, BloodPressure, SkinThickness, Insulin, BMI, DiabetesPedigreeFunction, Age. Pregnancies/Age are integers; all values are JSON numbers.
- Cardio: POST `/api/predict/cardio` with exactly age, sex, cp, trestbps, chol, fbs, restecg, thalach, exang, oldpeak, slope, ca, thal. All are integers except numeric oldpeak.
- Codes: sex/fbs/exang 0–1; cp/ca 0–3; restecg/slope/thal 0–2. Labels deliberately say **Code N**. The supplied data dictionary is empty and the synthetic notebook does not establish meaningful labels. The ML team must confirm every categorical meaning and model encoding.
- Empty fields never become zero. Required values, finite numbers, safe integers and categorical codes are validated inline. Measurements are nonnegative except oldpeak, which may be signed. No speculative upper medical limits are applied.
- Raw values are sent unchanged. The backend handles imputation/scaling and treats explicit zero in Glucose, BloodPressure, SkinThickness, Insulin and BMI as missing.
- A prediction requires numeric 0/1 prediction, finite percentage in [0,100], and a nonblank risk label. Display uses the actual backend label and percentage without recalculating thresholds or multiplying by 100.
- Both flows support initial/loading/success/error, duplicate-submit prevention, retry and reset. Editing, resetting, starting another submission or a failed request clears the earlier result. Reset/unmount cancels pending requests and ignores late results. Cancellation does not undo a request already processed on the server.
- Requests timeout after 20 seconds. Timeout messaging acknowledges that a retry may save another record. Network, FastAPI 422, JSON/non-JSON HTTP failures and malformed success payloads are handled.
- GET `/api/shap-importance` is validated separately, including HTTP-200 arrays containing error objects. A SHAP failure cannot hide a successful diabetes result. The chart labels global diabetes importance, prints the supplied scores and scales bar length by absolute magnitude; scores are not risk percentages. Cardio never fetches SHAP.
- No input logging or browser persistence. Predictions send inputs to the backend, which saves inputs/results in SQLite. No fabricated history or authentication.

## Backend integration status and remaining prerequisites

**Source verification completed** against backend/main.py, routes/prediction.py, models/schemas.py, services/model_service.py, services/shap_service.py and database/database.py.

**Diabetes:** frontend complete and mock-tested. All three real artifacts exist in ML_Model/models: best_model.pkl, scaler.pkl, imputer.pkl. Actual model inference is **not verified**. Training metadata records scikit-learn 1.9.0 while backend requirements pin 1.9.1. The backend/ML team needs to verify compatible dependencies and artifact loading; this version difference alone is not proof of failure.

**Cardiovascular:** frontend complete, reachable and mock-tested. backend/app/ml_models/cardio_model.joblib and cardio_scaler.joblib are absent. The backend/ML team must supply the genuine trained model and matching scaler, and confirm feature order/encoding and category labels. The supplied notebook uses random features and labels; it was not run. A generic HTTP 500 does not identify its underlying cause.

**Local runtime:** Python 3.14.4 is available, but its fastapi, uvicorn, sklearn, pandas, joblib and sqlalchemy modules are absent. No Python packages were installed or changed. Live backend verification was unavailable, and no prediction requests were sent to the user's backend/database. A root health response would prove only server reachability.

### Separate backend terminal, after a compatible environment is supplied

The following commands use a disposable copy so verification cannot append to the original SQLite database. Use the backend team's already provisioned Python environment; do not assume the system Python has dependencies.

```powershell
$sourceProject = 'D:\GitHubProject\TriNexus'
$checkRoot = Join-Path $env:TEMP ('vitaguard-check-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $checkRoot | Out-Null
Copy-Item -LiteralPath (Join-Path $sourceProject 'backend') -Destination $checkRoot -Recurse
Copy-Item -LiteralPath (Join-Path $sourceProject 'ML_Model') -Destination $checkRoot -Recurse
Set-Location (Join-Path $checkRoot 'backend')
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

These startup commands are provided for handoff; they were not executed here because the runtime dependencies are missing. Keep this terminal open and use the frontend at localhost:5173 in another terminal. The copied backend's SQLite file receives any test records. Never infer successful model loading from GET / alone. Do not generate dummy cardio artifacts to make tests pass.

## Checks performed

- npm dependency installation: completed; lockfile generated; audit reported zero vulnerabilities at installation.
- `npm test`: **33 passed** across the service/validation and React flow suites. These use synthetic test fixtures and mocked fetch responses, **not real model inference**.
- Both forms: exact field names/types/endpoints, result labels/percentages, required values, integer/code constraints, explicit zero, empty/nonfinite rejection, loading, duplicate prevention, reset, cancellation, stale-result clearing, retry, network/422/plain-text-500 and malformed responses.
- Request timeout/cancellation, configured origin validation and invalid SHAP/error arrays; successful prediction remains visible when SHAP is unavailable; SHAP retry and supplied-score rendering.
- `npm run build`: passed.
- In-app browser: desktop 1440×1000 and mobile 390×844; both disease pages render, navigation works, labels/codes are present, mobile fields become a single column, no page-level horizontal overflow, empty submission focuses the first invalid field, code zero remains valid. No browser warnings/errors in the inspected pages.
- Production model accuracy, runtime compatibility and live inference are outside these mocked checks and remain unverified.
- Non-frontend files are compared with their pre-edit SHA-256 inventory; see COMPLETION.md for final preservation results.

## Files added or changed

Every path below is relative to frontend/.

| File | Purpose |
| --- | --- |
| package.json | React/Vite dependencies and dev/build/preview/test commands |
| package-lock.json | Package-manager-generated dependency lock |
| index.html | Accessible HTML entry and metadata |
| vite.config.js | React plugin, strict port 5173, local API proxy and test setup |
| .env.example | Backend-origin configuration example |
| .gitignore | Exclude build/dependency/private environment and verification output |
| README.md | Setup, deployment, contracts, checks and backend prerequisites |
| COMPLETION.md | Final verification report and preservation evidence |
| src/main.jsx | React and BrowserRouter bootstrap |
| src/App.jsx | Routes, shared layout, route focus, scroll and not-found state |
| src/index.css | Responsive visual design, focus styling and reduced motion |
| src/components/Navbar.jsx | Public navigation for both flows |
| src/components/Footer.jsx | Product footer and non-diagnostic notice |
| src/components/AssessmentCards.jsx | Shared disease entry cards |
| src/components/PredictionForm.jsx | Shared validated form, request lifecycle and accessibility |
| src/components/ResultCard.jsx | Disease, backend risk label and unscaled percentage |
| src/components/ShapChart.jsx | Isolated global-diabetes chart, error handling and retry |
| src/components/AwarenessSection.jsx | Interpretation and data-handling context |
| src/pages/Home.jsx | Overview with both disease entry cards |
| src/pages/Dashboard.jsx | Assessment hub without fabricated history/statistics |
| src/pages/DiabetesPredict.jsx | Diabetes schema/service wiring |
| src/pages/CardioPredict.jsx | Cardiovascular schema/service wiring |
| src/pages/Awareness.jsx | Context and global diabetes feature importance |
| src/services/api.js | Preserved prediction functions, SHAP client and centralized errors |
| src/utils/validationSchemas.js | Exact fields, code sets and raw-value validation |
| tests/setup.js | Test DOM setup, cleanup and mock isolation |
| tests/contracts.test.js | Service, response, timeout and validation checks |
| tests/flows.test.jsx | Complete mocked user flows for both diseases |
| test_script.js | Replaces live database-writing test with safe npm-test guidance |

Empty authentication, video, locale and placeholder scaffold files are unchanged. node_modules/ and dist/ are generated locally and ignored. No root config, backend, requirements, databases, datasets, model artifacts or training files were edited.
