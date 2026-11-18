# RentMaster - University Academic Rental Management System

A complete, modern, full-stack **Rental Management System** designed and developed as a university/school academic project. Built with pure **HTML5, CSS3, Vanilla JavaScript, Node.js, Express.js, and MongoDB (Mongoose)** without frontend frameworks, adhering strictly to clean coding practices and modern UI/UX design standards.

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Key Features](#key-features)
3. [Technology Stack](#technology-stack)
4. [System Architecture](#system-architecture)
5. [Database Schema Design](#database-schema-design)
6. [Rent Balance Calculation Formula](#rent-balance-calculation-formula)
7. [Prerequisites & Requirements](#prerequisites--requirements)
8. [Installation & Setup Guide](#installation--setup-guide)
9. [Running the Application](#running-the-application)
10. [Academic Presentation & Demonstration Guide](#academic-presentation--demonstration-guide)
11. [Administrator Credentials](#administrator-credentials)
12. [REST API Documentation](#rest-api-documentation)
13. [Testing](#testing)

---

## 🎯 Project Overview

The **Rental Management System** (RentMaster) enables a property administrator or landlord to manage rental rooms, tenant registrations, and monthly rent payments from a centralized administrative dashboard. 

The system was crafted specifically for university/college academic demonstrations:
- **Zero Frontend Frameworks:** Implemented using pure HTML5, CSS3, and Vanilla JavaScript with standard `fetch()` API calls to illustrate fundamental web architecture.
- **Robust Backend:** Structured Express.js REST API with modular routers, controllers, and middleware.
- **Relational Data Integrity in MongoDB:** Utilizes Mongoose schemas with ObjectId references, cascade logic, and unique room constraint checks.
- **Real Dynamic Calculations:** All statistics, charts, and tenant balances are computed live from MongoDB records—no hardcoded figures.

---

## ✨ Key Features

### 1. 🔐 Administrator Authentication & Security
- Secure login portal with email and password validation.
- Password hashing using `bcryptjs` with salt rounds.
- Session authentication via JSON Web Tokens (JWT) stored in HTTP-Only cookies and browser local storage.
- Route protection middleware (`authMiddleware.js`) preventing unauthorized access to all management APIs.
- Settings module to update administrator profile and change password.

### 2. 📊 Dynamic Management Dashboard
- **6 Real-time Key Metrics:**
  1. Total Rental Rooms
  2. Occupied Rooms (with dynamic occupancy percentage)
  3. Vacant Rooms (available for rent)
  4. Total Active Tenants
  5. Total Rent Revenue Collected
  6. Total Outstanding Rent Arrears
- **Visual Analytics:** Interactive monthly rent collection bar chart (past 6 months).
- **Recent Activities:** Latest 5 payments with quick receipt viewing, and latest 5 registered tenants.
- **Quick Action Triggers:** One-click shortcuts to record payments, add rooms, or register tenants.

### 3. 🚪 Room Management
- Add, view, edit, and delete rental rooms.
- Fields: Unique Room Number, Monthly Rent, Description, and Occupancy Status (`Vacant` / `Occupied`).
- Dual Display Mode: Toggle between **Interactive Cards View** and **Detailed Table View**.
- Intelligent deletion safety: The system strictly prevents deleting a room while an active tenant is occupying it.

### 4. 👥 Tenant Management
- Register new tenants: Full Name, Phone Number, Optional Email, National ID/Passport Number, Allocated Room, and Move-In Date.
- **Automatic Room Allocation:** Selecting a vacant room automatically updates that room's status to `Occupied`.
- **Conflict Prevention:** Strictly forbids assigning two active tenants to the same room.
- **Room Transfer Support:** Editing a tenant to change their room automatically frees up the old room and occupies the new room.
- **Safe Vacating Workflow:** Vacating a tenant immediately resets their allocated room to `Vacant` and preserves payment audit history.
- **Tenant Financial Statement:** Detailed breakdown of months billed, total rent due, total paid, and outstanding balance with full transaction history.

### 5. 💳 Rent Payment Management
- Record payments: Select tenant (system automatically detects and displays their allocated room and current balance).
- Payment methods supported: **Cash**, **Mobile Money**, and **Bank Transfer**.
- Optional transaction references and notes.
- Search payments by tenant name, room number, or transaction reference.
- Date range and payment method filters.
- **Official Printable Receipt:** Generates an official payment receipt voucher with a built-in "Print Receipt" feature.

### 6. 📈 Reports & Analytics
- Aggregate financial health: Total Collected, Total Outstanding, and Overall Collection Rate (%).
- Filter transactions by Year and Month.
- **One-Click CSV Export:** Generates and downloads a clean `payments_report.csv` spreadsheet file for accounting records.

---

## 🛠 Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Structure** | HTML5 | Semantic page layouts and accessible forms |
| **Frontend Styling** | CSS3 | Custom responsive design system, green accent (`#166534`), cards, tables, modals |
| **Frontend Logic** | Vanilla JavaScript (ES6+) | DOM manipulation, Fetch API, modal controller, state management |
| **Icons** | Lucide Icons | Clean, modern vector icons |
| **Data Visualization**| Chart.js & SVG Fallback | Responsive monthly rent collection analytics |
| **Backend Runtime** | Node.js (v18+) | Server-side execution environment |
| **Web Framework** | Express.js (v5) | RESTful API routing, JSON body parsing, static file serving |
| **Database** | MongoDB | NoSQL document database |
| **Data Modeling** | Mongoose (v9) | Object Data Modeling (ODM), schema validation, hooks |
| **Security** | `bcryptjs`, `jsonwebtoken` | Secure password hashing and token-based authentication |

---

## 📐 System Architecture

```
rental_management_system/
├── package.json               # Project manifest, dependencies and scripts
├── server.js                  # Express server entry point and middleware configuration
├── .env                       # Environment configuration (Port, Mongo URI, JWT Secret)
├── .env.example               # Example environment template
├── config/
│   └── db.js                  # MongoDB Mongoose connection handler
├── models/
│   ├── User.js                # Administrator schema with bcrypt password hashing
│   ├── Room.js                # Room schema (unique roomNumber, monthlyRent, status)
│   ├── Tenant.js              # Tenant schema (linked to Room ObjectId)
│   └── Payment.js             # Payment schema (linked to Tenant & Room ObjectIds)
├── routes/
│   ├── authRoutes.js          # Authentication endpoints (login, logout, me, profile)
│   ├── roomRoutes.js          # Room CRUD operations
│   ├── tenantRoutes.js        # Tenant CRUD, room assignment & vacating logic
│   ├── paymentRoutes.js       # Rent payment recording & receipt endpoints
│   ├── dashboardRoutes.js     # Live metrics, monthly chart data & recent records
│   └── reportRoutes.js        # Financial summary & CSV report export
├── middleware/
│   └── authMiddleware.js      # JWT authentication protection middleware
├── utils/
│   └── rentCalculator.js      # Deterministic rent balance calculation engine
├── scripts/
│   └── seed.js                # Database seeder with sample rooms, tenants, payments
├── tests/
│   └── integration.test.js    # Comprehensive automated end-to-end integration test suite
└── public/                    # Frontend client assets
    ├── index.html             # Single-Page Application (SPA) dashboard layout
    ├── login.html             # Clean administrator login portal
    ├── css/
    │   ├── style.css          # Design system, sidebar, cards, tables, modals, print styles
    │   └── login.css          # Dedicated login styling
    └── js/
        ├── api.js             # Centralized Fetch wrapper, toasts, formatting
        ├── auth.js            # Authentication state and profile controller
        ├── dashboard.js       # Dashboard statistics and Chart.js integration
        ├── rooms.js           # Room management, card/table view toggle
        ├── tenants.js         # Tenant registration, room allocation, statements
        ├── payments.js        # Payment recording, auto-fill room info, receipt view
        ├── reports.js         # Financial reporting, monthly filters, CSV export
        └── app.js             # Navigation controller, modals, settings logic
```

---

## 🗄 Database Schema Design

### 1. `User` Collection
| Field | Type | Rules | Description |
| :--- | :--- | :--- | :--- |
| `name` | String | Required | Administrator full name |
| `email` | String | Required, Unique, Lowercase | Administrator login email |
| `password` | String | Required, Hashed | Bcrypt hashed password |
| `createdAt`| Date | Default `Date.now` | Account creation timestamp |

### 2. `Room` Collection
| Field | Type | Rules | Description |
| :--- | :--- | :--- | :--- |
| `roomNumber` | String | Required, Unique, Uppercase | Unique room identifier (e.g., 101, 201) |
| `monthlyRent`| Number | Required, Min: 0 | Monthly rental price in USD |
| `description`| String | Optional | Room description and amenities |
| `status` | String | Enum: `['Vacant', 'Occupied']` | Live occupancy status |

### 3. `Tenant` Collection
| Field | Type | Rules | Description |
| :--- | :--- | :--- | :--- |
| `fullName` | String | Required | Full legal name |
| `phone` | String | Required | Primary phone contact |
| `email` | String | Optional | Email address |
| `identificationNumber`| String | Optional | National ID or Passport number |
| `roomId` | ObjectId | Ref: `'Room'`, Required | Allocated rental room |
| `moveInDate` | Date | Required, Default `Date.now` | Date tenant moved into the unit |
| `active` | Boolean | Default `true` | `true` if current tenant, `false` if vacated |
| `vacatedDate`| Date | Optional | Date of vacancy |

### 4. `Payment` Collection
| Field | Type | Rules | Description |
| :--- | :--- | :--- | :--- |
| `tenantId` | ObjectId | Ref: `'Tenant'`, Required | Tenant making the payment |
| `roomId` | ObjectId | Ref: `'Room'`, Required | Room being paid for |
| `amountPaid` | Number | Required, Min: > 0 | Amount paid in USD |
| `paymentDate`| Date | Required, Default `Date.now` | Date payment was received |
| `paymentMethod`| String | Enum: `['Cash', 'Mobile Money', 'Bank Transfer']` | Payment channel |
| `transactionReference`| String | Optional | Bank transfer / Mobile Money ID |
| `description`| String | Optional | Payment memo/description |

---

## 🧮 Rent Balance Calculation Formula

In academic projects, rent calculations must be fair, logical, and easy to explain to an examiner:

1. **Billing Period Calculation:**
   Given tenant move-in date $D_{start}$ and current billing date $D_{now}$ (or vacancy date if vacated):
   $$\text{Months Billed} = (\text{Year}_{now} - \text{Year}_{start}) \times 12 + (\text{Month}_{now} - \text{Month}_{start}) + 1$$
   *(Minimum 1 month commences upon move-in)*.

2. **Total Rent Due:**
   $$\text{Total Due} = \text{Months Billed} \times \text{Room Monthly Rent}$$

3. **Total Rent Paid:**
   $$\text{Total Paid} = \sum \text{Payment Amount for Tenant}$$

4. **Net Balance:**
   $$\text{Balance} = \text{Total Due} - \text{Total Paid}$$
   - If $\text{Balance} \le 0$: Tenant is marked as **Paid in Full** (green badge).
   - If $\text{Balance} > 0$: Tenant is marked as **Outstanding Arrears** (red badge).

---

## ⚙ Prerequisites & Requirements

- **Node.js:** v18.0.0 or higher (v20+ recommended).
- **MongoDB:** Locally installed MongoDB Server running on `mongodb://localhost:27017` OR a free cloud cluster on [MongoDB Atlas](https://www.mongodb.com/atlas).
- **Web Browser:** Any modern browser (Google Chrome, Mozilla Firefox, Microsoft Edge, Safari).

---

## 🚀 Installation & Setup Guide

### Step 1: Open the Project Directory
```bash
cd c:\Users\User\Desktop\pro-jxtz\rental_management_system
```

### Step 2: Install Node.js Dependencies
```bash
npm install
```

### Step 3: Configure Environment Variables
A pre-configured `.env` file is included. If needed, customize values:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/rental_management_db
JWT_SECRET=academic_rental_system_jwt_secret_key_2026_xyz
JWT_EXPIRE=7d
```

### Step 4: Seed the Database with Sample Data
Populate initial administrator credentials, 6 rooms, 4 tenants, and 10 payment records:
```bash
npm run seed
```

---

## 🖥 Running the Application

### Start the Server
```bash
npm start
```
The server will start on port `5000`:
- **Web Dashboard:** [http://localhost:5000](http://localhost:5000)
- **Login Portal:** [http://localhost:5000/login](http://localhost:5000/login)

---

## 🔑 Administrator Credentials

| Field | Value |
| :--- | :--- |
| **Portal URL** | [http://localhost:5000/login](http://localhost:5000/login) |
| **Email Address** | `admin@rental.com` |
| **Password** | `admin123` |

*(Tip: On the login screen, click the **"Click here to auto-fill demo credentials"** button for quick demonstration during your presentation).*

---

## 🎓 Academic Presentation & Demonstration Guide

Follow this step-by-step walkthrough during your classroom or lab presentation:

1. **Demonstrate Login & Security:**
   - Open [http://localhost:5000/login](http://localhost:5000/login).
   - Click the auto-fill button and sign in.
   - Explain how `bcryptjs` validates the hashed password and issues an encrypted JWT token.
2. **Explain the Dashboard:**
   - Point out the 6 dynamic summary cards. Emphasize that all numbers (Occupied: 4, Vacant: 2, Revenue: $4,340, Arrears: $950) are dynamically queried from MongoDB.
   - Show the monthly collection chart and the recent payments table.
3. **Demonstrate Room Management:**
   - Click the **Rooms** navigation link.
   - Toggle between **Cards View** and **Table View**.
   - Click **Add Room** and create a new room (e.g., Room `301`, Rent: `$500`, "Penthouse Studio").
   - Notice Room 301 is created with `Vacant` status.
4. **Demonstrate Tenant Registration & Automated Room Occupancy:**
   - Click **Tenants** -> **Register Tenant**.
   - Enter name "Alice Johnson", phone number "+1 555-0819", and select Room `301`.
   - Submit the form. Show how Room `301` automatically transitions from `Vacant` to `Occupied`.
   - Attempt to register a second tenant in Room `301`: show the error alert preventing double allocation.
5. **Demonstrate Rent Recording & Balance Updates:**
   - Click **Record Payment** from the top header.
   - Select "Alice Johnson" from the dropdown. Show how the system instantly detects her room (`301`), monthly rent (`$500`), and outstanding status.
   - Record a `$500` payment using `Bank Transfer`.
   - The official **Payment Receipt** modal pops up immediately. Click **Print Receipt** to display the browser print preview!
   - View Alice's statement in the Tenants tab to show her balance is now `$0.00` (Paid in Full).
6. **Demonstrate Vacating a Tenant:**
   - Click the **Vacate** button for Alice.
   - Explain that Alice is archived as a former tenant, and Room `301` is instantly released back to `Vacant` status for future tenants.
7. **Demonstrate Reports & CSV Export:**
   - Click **Reports**. Filter by month and year.
   - Click **Export CSV** to download `payments_report.csv` and show it open in Microsoft Excel or Google Sheets.

---

## 📡 REST API Documentation

### Authentication (`/api/auth`)
- `POST /api/auth/login`: Administrator login, returns JWT token.
- `POST /api/auth/logout`: Clears session cookie.
- `GET  /api/auth/me`: Returns current administrator details.
- `PUT  /api/auth/update-profile`: Updates administrator name and email.
- `PUT  /api/auth/change-password`: Verifies old password and updates to new password.
- `GET  /api/auth/system-info`: Returns server uptime and MongoDB diagnostics.

### Rooms (`/api/rooms`)
- `GET    /api/rooms`: List all rooms with filter options (`?search=&status=`).
- `GET    /api/rooms/available`: List only currently vacant rooms.
- `GET    /api/rooms/:id`: Get details of a single room.
- `POST   /api/rooms`: Add a new room.
- `PUT    /api/rooms/:id`: Update room information.
- `DELETE /api/rooms/:id`: Delete room (fails with error if active tenant exists).

### Tenants (`/api/tenants`)
- `GET    /api/tenants`: List all tenants with calculated balances and room data.
- `GET    /api/tenants/:id`: Get single tenant, payment history, and detailed statement.
- `POST   /api/tenants`: Register tenant, allocate room, set room to Occupied.
- `PUT    /api/tenants/:id`: Update tenant details or transfer rooms.
- `PATCH  /api/tenants/:id/vacate`: Vacate tenant and reset room to Vacant.
- `DELETE /api/tenants/:id`: Remove tenant record and associated payments.

### Payments (`/api/payments`)
- `GET    /api/payments`: List payments with search, method, and date filters.
- `GET    /api/payments/:id`: Get receipt voucher for a single payment.
- `POST   /api/payments`: Record a rent payment and recalculate balance.
- `DELETE /api/payments/:id`: Remove payment and adjust tenant balance.

### Reports (`/api/reports`)
- `GET /api/reports/summary`: Aggregate metrics (Collection Rate %, Occupancy Rate %).
- `GET /api/reports/payments`: Filter payments by `?year=&month=`.
- `GET /api/reports/export-csv`: Streams a formatted `.csv` file download.

---

## 🧪 Testing

The system includes an automated end-to-end integration test suite verifying all routes, database operations, room vacancy toggles, and business logic.

To run the test suite:
```bash
npm test
```
**Test Coverage Includes:**
- Static HTML serving (`/login` and `/`)
- Admin login and JWT token validation
- Dynamic dashboard calculations
- Room CRUD operations
- Tenant allocation and duplicate room prevention
- Rent payment recording and receipt verification
- Live report aggregation and CSV generation
- Vacating workflow and room status recovery

---

## 👨‍🎓 Project Credits & Submission Details
- **Project Title:** Rental Management System (RentMaster)
- **Target Audience:** University / College Academic Project Presentation
- **Architecture:** Monolithic Express.js + Vanilla JS SPA Architecture
- **Database:** MongoDB & Mongoose ODM
