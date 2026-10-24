# HCM Lite — AI-assisted Human Capital Management System
### Saylani Hackathon 2026 (Zaitoon Ashraf IT Park)

HCM Lite is an enterprise-grade Human Capital Management system built strictly following the **Saylani Hackathon Challenge Brief**. It implements all **25 required functionalities across 9 modules**, enforces server-side role & data-scope guards (Admin, HR, Employee), generates PDF payslips with progressive tax calculations, and provides an AI assistant with tool-calling capabilities and Roman Urdu support.

---

## 🚀 Quick Start (Under 5 Minutes)

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node v24)
- **MongoDB**: Local MongoDB service running (`net start MongoDB` in admin terminal) or any MongoDB Atlas connection string.

### 2. Install & Start Backend
```bash
cd backend
npm install
npm start
```
*The backend API will start on `http://localhost:5000`.*

### 3. Start Frontend
```bash
cd frontend
npm install
npm run dev
```
*Open `http://localhost:5173` in your browser.*

---

## 📋 5-Minute Demo Walkthrough (Judges Script)

Judges start from a **clean setup** where no pre-loaded dummy data exists:

1. **First-Run Setup (Admin)**:
   - When the web app starts empty, the **First-Run Setup Wizard** opens automatically.
   - Enter Company Name (`Saylani Welfare Trust`), Admin Email (`admin@saylani.org`), and Password (`Admin@2026!`).
   - Configure office timings (09:00 AM, 15 min grace period) and geofence radius. Click **Initialize HCM Lite**.

2. **HR Account Creation**:
   - Log in as Admin and navigate to **Org Setup & HR Logins**.
   - Create an HR login: `hr@saylani.org` with password `SaylaniHR@2026`.

3. **Register Employees (HR)**:
   - Log in as HR (`hr@saylani.org`).
   - Register 2–3 employees or use the **CSV Bulk Import** with dry-run validation.
   - Each registered employee automatically receives an account with a temporary password (`SaylaniEmployee@2026`).

4. **Employee Self-Service & First Login**:
   - Log in as an employee. The app enforces a **Mandatory Password Change** on first sign-in.
   - Set a new password to proceed to the **Employee Dashboard**.
   - Click **Web Check-In** or **Camera & GPS Check-In** (verifies face & office radius).
   - Click **Smart Leave Form**, type `"Need next Monday and Tuesday off for my sister's wedding"`, and click **Auto-Fill Form** to submit.

5. **HR Approvals & Payroll Run**:
   - Switch to HR: view the pending leave in the Approval Inbox and click **Approve**.
   - Navigate to **Monthly Payroll Run** and click **Generate Draft for Current Month**.
   - Switch to Admin and click **Finalize & Lock Payroll**.

6. **Payslip & AI Refusal**:
   - Log back in as Employee: view and download the official **Payslip PDF** with earnings and tax deductions.
   - Open the **AI Assistant** and ask for a colleague's salary: the AI **politely refuses** based on server-side scope guards!
   - Log back into Admin to inspect the **Immutable Audit Trail Feed**.

---

## 🛠️ Implemented Architecture & Modules

| Module | Features Implemented | Access Control |
|---|---|---|
| **M1: Auth & Access** | JWT authentication, bcrypt hashing, mandatory password change on first sign-in | All roles |
| **M2: Org Setup** | Company settings, office hours (09:00 + 15 min grace), departments, designations, public holidays | Admin manage, HR view |
| **M3: Employees** | Directory with search/filters, Employee 360 profile, CSV dry-run validator (`row + field + reason`), CSV import | HR manage, Employee own |
| **M4: Attendance** | Web & Camera check-in (Haversine GPS geofence), 409 duplicate check-in prevention, late after 09:15 AM, half-day under 5 hrs, corrections | Scope guarded |
| **M5: Leave** | Quota tracking (Annual 14, Sick 8, Casual 10, Unpaid unlimited), working days calculation (skips weekends/holidays), 422 overlap/over-balance prevention, HR approval inbox | Scope guarded |
| **M6: Payroll Lite** | Gross = 1.5 × Basic (HRA 40%, Medical 10%), attendance deductions, 5-tier progressive tax slabs, Admin finalization lock, PDF payslips | Scope guarded |
| **M7: Dashboards** | Role-specific dashboards (Admin, HR, Employee) with real database aggregations and KPI metrics | Role filtered |
| **M8: AI Assistant** | Tool-calling assistant, Smart Leave NLP parser, KPI summarizer, Policy Q&A, rate-limiting, Roman Urdu understanding | Scope guarded |
| **M9: Comms & Audit** | Company announcements, in-app notifications, immutable audit log feed | Scope guarded |

---

## 🔒 Environment Variables (`.env.example`)

```env
PORT=5000
NODE_ENV=development

# Database Connection (Local or Atlas)
MONGODB_URI=mongodb://127.0.0.1:27017/hcm_lite

# Security
JWT_SECRET=saylani-hackathon-2026-hcm-lite-jwt-secret-key-321
JWT_EXPIRES_IN=24h

# Optional external LLM key (Built-in rule-engine fallback works out of the box without any key)
AI_API_KEY=
AI_MODEL=gemini-1.5-flash
```

---

## 🏆 Bonus Points Implemented (+10 Points)
1. **Camera attendance with face detection & GPS geofencing** (Haversine formula).
2. **Late penalty rule** (3 lates = 0.5-day salary deduction).
3. **AI Roman Urdu comprehension** (e.g., *"Mujhe kal chutti chahiye"*, *"Kitni sick leave bachi hain?"*).
4. **Dry-run CSV error validator** with exact row, field, and reason reporting.

