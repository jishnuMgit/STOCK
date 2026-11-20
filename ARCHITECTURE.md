# STOCK Project Architecture

## Application Flowchart

```mermaid
flowchart TD
    Start([User opens STOCK])
    Login{Authenticated?}
    LoginPage[Login Page]
    Modules[Business Modules<br/>Dashboard, Finance, Purchase,<br/>Sales, Assets, Security, Settings]
    Action[User views or submits data]
    Request[Frontend sends API request<br/>with session cookie]
    API[Express API<br/>/api]
    Auth{Session valid?}
    Reject[Return authentication error]
    Validate{Request valid?}
    BadRequest[Return validation error]
    Controller[Controller]
    Service[Business Service]
    DB[(PostgreSQL)]
    Result[Return JSON or generated report]
    Render[Display result in the UI]
    Zatca{ZATCA action?}
    XML[Build invoice XML]
    Sign[Sign through .NET SDK bridge]
    Submit[Submit to ZATCA API]

    Start --> Login
    Login -->|No| LoginPage
    LoginPage -->|Login succeeds| Modules
    Login -->|Yes| Modules
    Modules --> Action
    Action --> Request
    Request --> API
    API --> Auth
    Auth -->|No| Reject
    Reject --> LoginPage
    Auth -->|Yes| Validate
    Validate -->|No| BadRequest
    BadRequest --> Render
    Validate -->|Yes| Controller
    Controller --> Service
    Service --> DB
    DB --> Service
    Service --> Zatca
    Zatca -->|No| Result
    Zatca -->|Yes| XML
    XML --> Sign
    Sign --> Submit
    Submit --> Result
    Result --> Render
    Render --> Modules
```

## System Architecture

```mermaid
flowchart LR
    User["Browser User"]

    subgraph Frontend["Frontend - React 19 / Vite"]
        Router["BrowserRouter<br/>Public and Protected Routes"]
        Pages["Feature Pages<br/>Administration, Finance, Purchase,<br/>Sales, Assets, Security, ZATCA"]
        Hooks["Hooks and Shared Components"]
        Storage["Local Browser Storage<br/>User / Company / Year context"]
    end

    subgraph Backend["Backend - Node.js / Express"]
        API["Express Server<br/>Port 5000 / /api"]
        Auth["Cookie Session Middleware"]
        Routes["Domain Routers"]
        Controllers["Request Controllers"]
        Validators["Request Validators"]
        Services["Business Services"]
        Utils["Utilities<br/>Posting, Audit, Printing, Number/Date Helpers"]
        Reports["Excel / PDF / HTML Report Services"]
    end

    DB[("PostgreSQL<br/>Connection Pool<br/>Tables and dbo Stored Procedures")]

    subgraph Zatca["ZATCA Integration"]
        Xml["UBL XML Builder"]
        Signer["Node ZATCA Signer"]
        Bridge["ZatcaSdkBridge.exe<br/>.NET SDK"]
        Dlls["SDK and BouncyCastle DLLs"]
        ZatcaApi["ZATCA Clearance / Reporting APIs"]
        Files["Generated XML and PDF/A3 Files"]
    end

    User --> Router
    Router --> Pages
    Pages --> Hooks
    Hooks -->|"fetch with credentials"| API
    Hooks --> Storage
    API --> Auth
    API --> Routes
    Routes --> Controllers
    Controllers --> Validators
    Controllers --> Services
    Services --> Utils
    Services --> Reports
    Services -->|"SQL / pool.query / refcursor"| DB
    Services --> Xml
    Xml --> Signer
    Signer -->|"stdin / JSON"| Bridge
    Bridge --> Dlls
    Signer -->|"Clearance or reporting request"| ZatcaApi
    Signer --> Files
```

## Request Flow

```mermaid
sequenceDiagram
    actor User
    participant UI as React Pages / Hooks
    participant API as Express /api
    participant Auth as Authentication Middleware
    participant Controller
    participant Validator
    participant Service
    participant PG as PostgreSQL

    User->>UI: Open page or submit action
    UI->>API: Fetch request with session cookie
    API->>Auth: Validate sessionToken
    Auth->>PG: Read session and user
    PG-->>Auth: User, company and status
    Auth-->>API: Attach authenticated user context
    API->>Controller: Route request
    Controller->>Validator: Validate input
    Validator-->>Controller: Validated or rejection
    Controller->>Service: Execute business operation
    Service->>PG: Query tables or call dbo procedures
    PG-->>Service: Result rows / refcursor data
    Service-->>Controller: Domain result
    Controller-->>UI: JSON response
    UI-->>User: Render data or notification
```

## ZATCA Submission Flow

```mermaid
flowchart TD
    UI["ZATCA Submission Page"]
    Router["ZATCASubmissionRouter"]
    Ctrl["ZATCASubmissionController"]
    Service["zatcaSubmissionService"]
    PG[("PostgreSQL Procedures")]
    Gateway["zatcaGateway"]
    Builder["zatcaXmlBuilder"]
    SDK["ZATCA .NET SDK Bridge"]
    Zatca["ZATCA Clearance / Reporting API"]
    Output["XML, QR, invoice hash and PDF/A3"]

    UI -->|"Search or submit document"| Router
    Router -->|"authenticate"| Ctrl
    Ctrl -->|"validate and select company/year"| Service
    Service -->|"Stored procedures and lookups"| PG
    PG --> Service
    Service -->|"Selected documents"| Gateway
    Gateway --> Builder
    Builder -->|"UBL XML"| SDK
    SDK -->|"Signed XML and hash"| Gateway
    Gateway -->|"B2B clearance or other reporting"| Zatca
    Zatca --> Gateway
    Gateway --> Service
    Service -->|"History and document status"| PG
    Service --> Output
```

## Backend Package Structure

| Area | Responsibility |
|---|---|
| `routes/` | Maps `/api` HTTP paths to routers and middleware |
| `controller/` | HTTP input/output coordination |
| `validators/` | Input validation and validation errors |
| `services/` | Business logic, SQL operations, reports and integrations |
| `middleware/` | Session authentication and request context |
| `DB/db.ts` | PostgreSQL connection pool |
| `utils/` | Shared posting, audit, formatting and document helpers |
| `zatca-bridge/` | Windows .NET executable and signing SDK dependencies |

## Frontend Package Structure

| Area | Responsibility |
|---|---|
| `src/pages/` | Route-level screens grouped by business module |
| `src/components/` | Reusable and transaction-specific UI |
| `src/hooks/` | API calls and reusable state behavior |
| `src/routes/` | Public, protected and application routing |
| `src/utils/` | Session, API and shared browser utilities |
| `src/config/` | Menu and application configuration |

## Main Business Domains

- Administration: companies, branches, years and documents
- Finance: chart of accounts, journals, receipts, payments, matching and reports
- Purchase: suppliers, items, stock, purchase invoices and purchase reports
- Sales: invoices, stock transfers, adjustments, price lists and sales reports
- Assets: purchases, depreciation, schedules and disposal
- Security: users, login audit, transaction audit and branch/menu permissions
- Settings and utilities: periods, posting accounts, document numbers, backup and year close
- ZATCA: electronic invoice submission, document status, PDF/A3 generation and document paths

## Runtime Configuration

- Frontend development URL: Vite, normally `http://localhost:5173`
- Backend API base: Express on port `5000`, mounted at `/api`
- Frontend API URL: `VITE_API_URL`
- PostgreSQL: `DBHOST`, `DBPORT`, `DATABASE`, `DBUSER` and `PASSWORD`
- ZATCA bridge: `ZATCA_BRIDGE_EXE` or `./zatca-bridge/ZatcaSdkBridge.exe`
- Cross-origin requests allow the local frontend and configured network frontend origins and include credentials.
