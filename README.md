# LabelLens

**Tagline:** *Scan it. Verify it. Track it.*  
**Application Type:** OCR-based smart product expiry detection, verification, lifecycle tracking, and reminder system.

---

## 🌟 Executive Summary

**LabelLens** is a full-stack web application designed to eliminate product waste and prevent health risks associated with expired food, skincare, cosmetics, medicines, and household chemicals. 

Unlike basic barcode lookup tools or static inventory apps, LabelLens directly analyzes packaging photos using **computer vision and OCR (Optical Character Recognition)**, extracts manufacturing dates (MFG), expiry dates (EXP), best-before dates (BBE), shelf-life durations, and periods after opening (PAO).

### 🛡️ Core Safety Rule: Zero Guesswork
LabelLens **never invents missing dates**, never silently resolves ambiguous formats (such as `03/04/2026`), and never automatically commits uncertain OCR output. Every detected date is presented in a structured side-by-side verification interface where the user reviews the original photo, resolves ambiguities, and confirms values before inventory persistence.

---

## 🚀 Key Features

1. **Camera Capture & File Upload:**
   - On-demand browser camera streaming with custom alignment viewfinder.
   - Drag-and-drop file upload with format (`JPEG`, `PNG`, `WebP`) and file-size validation.
2. **Automated Image Quality Diagnostics:**
   - Server-side analysis via Sharp computing Laplacian blur variance, brightness (underexposed/glare), contrast, and resolution.
   - Actionable feedback and tips to guide the user before or during verification.
3. **Multi-Format OCR Engine:**
   - Powered by Tesseract.js with adaptive image preprocessing (auto-orientation, grayscale contrast stretching, and unsharp masking).
   - Extracts:
     - ISO dates (`YYYY-MM-DD`, `YYYY/MM/DD`)
     - European / International numeric dates (`DD/MM/YYYY`)
     - Month-precision dates (`MM/YYYY`, `MM/YY`)
     - Text month dates (`15 OCT 2026`, `OCT 2026`)
     - Proximity keywords (`MFG`, `MFD`, `PROD`, `EXP`, `EXD`, `USE BY`, `BBE`)
     - Explicit shelf-life statements (`"Best before 24 months from manufacture"`)
     - Period After Opening (`"6M"`, `"12M"`, `"24M"`)
4. **Confidence-Aware Verification:**
   - Identifies candidate ambiguities (e.g. `03/04/2026` could mean March 4 or April 3).
   - Highlights label discrepancies (e.g. if printed EXP differs from MFG + shelf life).
   - Side-by-side verification interface with single-click candidate assignment chips.
5. **Precision & Date Arithmetic Engine:**
   - Strict separation between **Day**, **Month**, and **Year** precision.
   - Month-end clamping arithmetic respecting leap years (e.g., Jan 31 + 1 month = Feb 29 in 2024, Feb 28 in 2023).
   - Independent tracking of **Printed Expiry**, **Calculated Shelf-Life**, and **After-Opening (PAO) Deadlines**.
6. **Product Lifecycle Tracking:**
   - Track products through **Active**, **Consumed**, and **Disposed** lifecycle states.
   - "Open Product" trigger initializes the PAO countdown timer and prioritizes the earlier deadline.
   - Complete audit trail in `ScanHistory` and timeline logging all original OCR values, edits, and milestones.
7. **Scheduled Reminder Engine:**
   - Hourly background scheduler (`node-cron`) evaluating active products against user timezones and reminder preferences.
   - Compound deduplication keys preventing duplicate alerts (`remind_<userId>_<productId>_<type>_<deadline>`).
   - Automatically silences reminders for consumed or disposed products.
   - Includes on-demand evaluation trigger (`/api/notifications/trigger-check`) for instant testing and demonstration.
8. **Interactive SaaS Dashboard:**
   - Real-time statistics: Total Active, Expiring in 2 Days, Expired, Opened (PAO Active), Consumed, and Disposed.
   - "Use First" prioritization list highlighting items nearing expiration.
   - Responsive Recharts visualizations: Expiry status distribution and category breakdown.

---

## 🏗️ Architecture & Technology Stack

```
LabelLens/
├── client/                     # Frontend (React 18, Vite, Tailwind CSS)
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/         # StatusBadge, LoadingSkeleton, EmptyState, Modal
│   │   │   ├── layout/         # AppLayout, Navbar, Sidebar
│   │   │   ├── scanner/        # CameraCapture, QualityMetrics
│   │   │   └── products/       # ProductCard, ProductTable, LifecycleModal, AddProductModal
│   │   ├── context/            # AuthContext, ToastContext
│   │   ├── pages/              # Login, Register, Dashboard, ScanProduct, VerifyDetails,
│   │   │                       # MyProducts, ProductDetail, Notifications, Settings
│   │   ├── services/           # Axios API configuration & interceptors
│   │   └── index.css           # Tailwind design tokens & custom styling
│   ├── package.json
│   └── vite.config.js
├── server/                     # Backend API (Node.js, Express, MongoDB)
│   ├── config/                 # Database connection & validated environment config
│   ├── controllers/            # Auth, Product, Scan, Dashboard, Notification controllers
│   ├── middleware/             # JWT auth, Multer upload, Rate limiting, Error handler
│   ├── models/                 # User, Product, ScanHistory, Notification Mongoose schemas
│   ├── services/               # dateParser, expiryService, imageQualityService,
│   │                           # imagePreprocessingService, ocrService, verificationService, notificationService
│   ├── jobs/                   # Scheduled reminder cron job (reminderJob.js)
│   ├── tests/                  # Unit tests (dateParser, expiryService) & Integration tests (api)
│   ├── package.json
│   ├── app.js
│   └── server.js
├── package.json                # Root orchestration & scripts
└── README.md
```

### Backend Technologies
- **Runtime:** Node.js (ES Modules)
- **Framework:** Express.js
- **Database:** MongoDB & Mongoose
- **Image Processing & Diagnostics:** Sharp (Laplacian edge response, grayscale contrast, auto-orientation)
- **OCR Engine:** Tesseract.js (Worker-based text extraction)
- **Security:** bcryptjs (password hashing), jsonwebtoken (JWT authentication), helmet (secure HTTP headers), express-rate-limit (endpoint abuse prevention)
- **Scheduler:** node-cron
- **Email (Optional):** Nodemailer

### Frontend Technologies
- **Framework:** React 18
- **Tooling & Bundler:** Vite
- **Styling:** Tailwind CSS
- **Routing:** React Router v6
- **Icons:** Lucide React
- **Analytics Charts:** Recharts
- **HTTP Client:** Axios (with request & response token interceptors)

---

## 📊 MongoDB Data Models

### 1. User (`users`)
- `name`: String
- `email`: Normalized unique String
- `passwordHash`: String (excluded from queries by default)
- `timezone`: IANA timezone string (default: `'UTC'`)
- `reminderDaysBefore`: Number of days prior to deadline for advance warning (default: `2`)
- `expiryDayReminderEnabled`: Boolean (default: `true`)
- `afterOpeningReminderEnabled`: Boolean (default: `true`)
- `emailNotificationsEnabled`: Boolean (default: `false`)

### 2. Product (`products`)
- `userId`: ObjectId (indexed, enforced ownership)
- `name`, `category`, `brand`: Product identity
- `imagePath`: Relative path to uploaded label photo
- `printedExpiryDate`, `printedExpiryDatePrecision`: Date & `'day' | 'month' | 'year' | 'unknown'`
- `manufacturingDate`, `manufacturingDatePrecision`: Date & precision
- `calculatedExpiryDate`, `calculatedExpiryDatePrecision`: Projected date from shelf-life
- `shelfLifeMonths`, `shelfLifeDuration`: Inferred or confirmed shelf life
- `openedAt`, `afterOpeningDurationMonths`, `afterOpeningDeadline`: PAO tracking
- `lifecycleStatus`: `'active' | 'consumed' | 'disposed'` (indexed)
- `verificationStatus`: `'confirmed' | 'manual' | 'needs_verification'`
- `dateSource`: `'ocr_printed' | 'ocr_calculated' | 'manual' | 'hybrid'`
- `notes`: Storage advice or batch numbers

### 3. ScanHistory (`scanhistories`)
- `userId`: ObjectId
- `productId`: ObjectId (optional link to created product)
- `originalImagePath`: String
- `originalOcrText`: String (preserved immutably)
- `extractedDateCandidates`: Array of parsed date candidates with precision, type, confidence, and context
- `imageQuality`: Blur score, brightness, contrast, resolution, overall rating, and warnings
- `originalCandidateValues`: Initial OCR candidates before user review
- `confirmedValues`: Confirmed values saved to inventory
- `correctionDetails`: Detailed audit trail of fields modified during review

### 4. Notification (`notifications`)
- `userId`, `productId`: ObjectIds
- `type`: `'expiry_warning' | 'expiry_day' | 'expired' | 'after_opening_warning' | 'system'`
- `title`, `message`: Notification content
- `scheduledFor`, `sentAt`, `readAt`: Timestamps
- `status`: `'pending' | 'sent' | 'cancelled' | 'failed'`
- `channel`: `'in_app' | 'email' | 'both'`
- `dedupeKey`: Compound unique indexed string enforcing idempotency

---

## ⚙️ Installation & Local Setup

### Prerequisites
- Node.js (v18+ or v20+ recommended)
- MongoDB instance (Local MongoDB, Docker, or MongoDB Atlas)

### 1. Clone the repository
```bash
git clone https://github.com/your-username/LabelLens.git
cd LabelLens
```

### 2. Configure Environment Variables

**Server Configuration (`server/.env`):**
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/labellens
JWT_SECRET=super_secret_labellens_jwt_development_key_12345
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
UPLOAD_DIR=uploads

# Optional Email Notification Configuration
EMAIL_HOST=
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASSWORD=
EMAIL_FROM=noreply@labellens.local
```

**Client Configuration (`client/.env`):**
```env
VITE_API_URL=/api
```

### 3. Install Dependencies
```bash
# Install root dependencies
npm install

# Install backend dependencies
cd server && npm install

# Install frontend dependencies
cd ../client && npm install
```

### 4. Configure MongoDB (Local Windows Service or MongoDB Atlas)

LabelLens connects to MongoDB via the `MONGODB_URI` environment variable in `server/.env`. No containerization or Docker is required.

**Option A: Local MongoDB on Windows**
1. Download and install [MongoDB Community Server for Windows](https://www.mongodb.com/try/download/community).
2. During installation, select **"Install MongoDB as a Service"** so MongoDB runs automatically in the background.
3. In PowerShell, verify that the MongoDB service is running:
   ```powershell
   Get-Service -Name "*mongo*"
   ```
4. Set your connection string in `server/.env`:
   ```env
   MONGODB_URI=mongodb://127.0.0.1:27017/labellens
   ```

**Option B: MongoDB Atlas (Cloud Hosted)**
1. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a database user and whitelist your IP address in Network Access.
3. Copy your connection string into `server/.env`:
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/labellens?retryWrites=true&w=majority
   ```

### 5. Seed Demo Data & Start Development Servers (PowerShell)

**Seed Sample Inventory & Evaluation Account:**
```powershell
npm run seed
```
This populates the database with demo products (fresh yogurt, urgent milk expiring in 2 days, expired berries, opened retinol serum with 6M PAO, medicines, disinfectants) and a ready-to-use account (`demo@labellens.local` / `Password123!`).

**Start Both Frontend and Backend Concurrently:**
```powershell
npm run dev
```

Or run them in separate PowerShell terminals:
```powershell
# Terminal 1: Backend API (Node + Express)
cd server
npm run dev

# Terminal 2: Frontend Client (Vite + React)
cd client
npm run dev
```

- **Frontend Client:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:5000](http://localhost:5000)
- **API Health Check:** [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 🧪 Testing

The test suite covers:
- **Date Parsing:** Extraction of numeric, ISO, named month formats, ambiguous dates, shelf-life phrases, and PAO symbols.
- **Expiry Logic:** Leap-year month calculations, precision handling, status transitions, and discrepancy detection.
- **API & Ownership:** User registration, authentication, authorization, IDOR prevention, product CRUD, lifecycle updates, and reminder deduplication.

To execute tests:
```bash
cd server
npm test
```

---

## 🎓 Demo & Technical Evaluation Guide

### 1. Rapid Demo Login
- Navigate to [http://localhost:5173/login](http://localhost:5173/login).
- Click **"Fill Demo Credentials"** or register a new account.

### 2. Testing OCR & Verification Flow
- Navigate to **"Scan Product"**.
- Either click **"Use Camera"** to capture a label, or upload a product photo.
- Click **"Run OCR & Date Verification"**.
- On the **"Verify Details"** screen:
  - Inspect the image quality diagnostics (blur, brightness, contrast).
  - Observe candidate chips (e.g. `15/10/2026`).
  - Modify any detected field or click candidate buttons to assign dates.
  - Click **"Confirm & Save to Inventory"**.

### 3. Testing Product Lifecycle & PAO
- Navigate to **"My Products"**.
- Click the **Open Product** icon on an active skincare or food item.
- Select the opening date and PAO duration (e.g. 6 months).
- Observe that the applicable deadline and expiry status instantly update.

### 4. Testing Scheduled Reminders On Demand
- Navigate to **"Notifications"**.
- Click **"Run Reminder Check"** in the top-right corner.
- The backend evaluates all active products against the user's timezone and settings, generating reminders without waiting for the cron schedule!
- Click the **Check** icon to mark an alert as read.

---

## 🔒 Security Architecture

1. **Strict Ownership Enforcement:** Every database query derives the owner directly from the verified JWT payload (`req.user._id`). User A can never query or mutate User B's products or scans.
2. **Safe Image Processing:** Uploaded files are validated for MIME type, dimensions, and integrity. Storage filenames use cryptographic random hex strings to prevent path traversal.
3. **Password Security:** Passwords hashed with `bcryptjs` using 10 salt rounds. Passwords hashes are explicitly excluded from Mongoose queries (`select: false`).
4. **Rate Limiting:** Auth endpoints and expensive OCR routes are rate-limited to prevent brute-force attacks and denial-of-service.
5. **Sanitized Error Responses:** Sensitive internal stack traces and database details are sanitized in production mode.

---

## 🔍 OCR Limitations & Image Diagnostics

While LabelLens incorporates automated preprocessing (orientation correction, grayscale contrast stretching, and unsharp masking), computer vision on consumer packaging has known physical boundaries:

1. **Curved & Cylinder Distortion:** Dates printed on curved bottles or aluminum cans may exhibit perspective skew. Users should position the lens normal (perpendicular) to the date text.
2. **Dot-Matrix & Inkjet Print Degradation:** Expiry stamps applied via low-resolution inkjet dot matrices on production lines may suffer from broken strokes or ink smudging. LabelLens calculates a lower character confidence score and flags such items for verification.
3. **Embossed & Debossed Codes:** Colorless stamp impressions on plastic bottle bottoms or crimped cosmetic tubes lack color contrast. Sharp's contrast diagnostic alerts the user if edge contrast is under the readability threshold.
4. **Specular Glare:** Direct flash reflections on glossy wrappers can wash out characters. The image diagnostic module detects overexposure (`mean > 215`) and advises diffusing the light source.
5. **Fail-Safe Fallback:** When optical recognition is hindered by physical packaging constraints, LabelLens never stalls user workflow—a manual entry modal is available with one click.

---

## 📅 Expiry Date Assumptions & Precision Policy

LabelLens implements strict, transparent arithmetic standards:

1. **Date Precision Hierarchy:**
   - **Day Precision (`DD/MM/YYYY`):** Exact calendar deadline evaluated at UTC midnight against the user's localized timezone.
   - **Month Precision (`MM/YYYY`):** For products labeled with month-only expiry (e.g. `10/2026`), industry standard dictates the item is safe through the **entire month**. LabelLens aligns the effective deadline with the last calendar day of that month (e.g. October 31, 23:59:59 UTC).
   - **Year Precision (`YYYY`):** Aligns with December 31 of the stated year.
2. **Precedence Hierarchy:**
   - **Printed Expiry Takes Precedence:** A confirmed printed date on the packaging always supersedes an inferred shelf-life estimate.
   - **Period After Opening (PAO) Override:** Once unsealed, cosmetics and perishable foods often spoil well before their printed shelf-life. If `afterOpeningDeadline < printedExpiryDate`, the earlier PAO deadline governs active countdowns and reminders.
3. **Month Arithmetic & Leap-Year Correctness:**
   - Calculations use month-end clamping. Adding 1 month to January 31 lands on February 29 during leap years (e.g. 2024), and February 28 during non-leap years.
4. **Ambiguity Handling:**
   - Numbers like `05/06/2026` are flagged as ambiguous candidates. The system presents both interpretations (`05 June 2026` vs `06 May 2026`) in the verification UI and mandates an explicit user selection before saving.

---

## 📄 License
MIT License. Created for the LabelLens project.
