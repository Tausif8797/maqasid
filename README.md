# Maqasid Bank - Community Fund Management System

A comprehensive web application for managing community-based lending and contribution funds. Built with a modern tech stack, this system enables admins to manage members, track contributions, issue loans, and generate detailed reports.

---

## 🏗️ Tech Stack

### Frontend
- **React 18** - UI library with hooks
- **React Router v6** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Recharts** - Data visualization and charts
- **React Icons** - SVG icon library
- **Vite** - Next-generation build tool

### Backend
- **Node.js + Express.js** - Server framework
- **MongoDB** - NoSQL database
- **Mongoose** - ODM for MongoDB
- **JWT** - JSON Web Token authentication
- **Bcrypt** - Password hashing
- **Morgan** - HTTP request logging
- **Helmet** - Security headers

---

## ✨ Core Features

### 1. **Member Management**
- Add, edit, delete members with complete profiles
- Track member status (Active/Inactive)
- Member joining dates and contribution tracking
- Soft-delete functionality to maintain data integrity

### 2. **Contribution Management**
- Record monthly contributions from members
- Track contribution status (Paid/Unpaid)
- Update contribution status with payment dates
- Auto-generate monthly contribution records
- Configurable monthly contribution amount via settings

### 3. **Loan Management**
- Issue loans to members with validation
- Track loan status (Active/Paid/Defaulted)
- Record loan repayments with automatic balance calculation
- Close loans when fully repaid
- Loan passbook with payment history timeline
- Prevent loans exceeding available balance

### 4. **Dashboard & Analytics**
- Real-time metrics (fund balance, active loans, members count)
- Monthly collections bar chart
- Loan distribution pie chart
- Available balance for lending
- Quick action buttons for common tasks

### 5. **Contribution Reports**
- Overall contribution summary with collection rate
- Monthly breakdown with expected vs. collected amounts
- Member contribution history by ID
- Defaulters list with outstanding amounts
- Collection rate analytics and trends

### 6. **Audit Logs & Notifications**
- Complete audit trail of all system actions
- Track IP address, user agent, timestamp, and performer
- In-app notifications for key events:
  - Member status changes
  - Loan issuance and closure
  - Repayment confirmations
  - Contribution status updates
- Notification inbox with read/unread status
- Fire-and-forget logging pattern (never blocks requests)

### 7. **Security & Access Control**
- Role-based access control (Admin/Member roles)
- JWT-based authentication
- Bcrypt password hashing
- Input validation on all endpoints
- CORS protection
- Helmet.js security headers

---

## 🚀 Getting Started

### Prerequisites
- Node.js v16+
- MongoDB (local or cloud)
- npm or yarn

### Installation

1. **Clone and install dependencies**
   ```bash
   npm install
   cd backend && npm install

---

## Member Module (Phases 1-4) Artifacts

- API guide with sample request/response payloads and testing checklist:
  - `backend/docs/member-phase1-4-api.md`
- Postman collection:
  - `backend/postman/member-phases-1-4.postman_collection.json`