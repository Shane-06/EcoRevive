# EcoRevive 🌿

> **A Full-Stack Plantation Lifecycle, Verification, and Monitoring Platform**

EcoRevive digitizes the entire lifecycle of a planted tree:
**DISCOVER → ASSESS → PLANT → PROVE → VERIFY → IDENTIFY → MONITOR → REWARD → TRACK**

---

## 🏗️ Architecture & Technology Stack

- **Frontend**: JavaScript, React.js, Vite, Tailwind CSS, React Router, Leaflet, OpenStreetMap, Browser Camera API, JS QR scanning/generation.
- **Backend**: JavaScript, Node.js, Express.js (Modular Monolith, REST APIs, JWT Authentication, Role-Based Access Control).
- **Database**: PostgreSQL with PostGIS extension (`POINT(geom, 4326)`), GiST spatial indexing.
- **External Integrations**: Backend-mediated Open-Meteo (weather/climate) and ISRIC SoilGrids (soil properties).

---

## 📁 Repository Structure

```
EcoRevive/
├── backend/            # Express.js modular monolith backend
├── frontend/           # React + Vite + Tailwind CSS frontend
├── database/           # PostgreSQL + PostGIS migrations and seed scripts
├── docs/               # System specifications and documentation
├── .gitignore          # Root Git ignore rules
├── .env.example        # Root environment template
└── README.md           # Project overview and setup instructions
```

---

## 🚀 Quick Start (Development)

### 1. Prerequisites
- **Node.js**: v18+ (tested with v24)
- **npm**: v9+
- **PostgreSQL**: v14+ with PostGIS extension enabled

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 📖 Specifications & Documentation

Complete specification documents are located in [`docs/`](./docs):
- [Product Requirements Document (PRD V1.0)](./docs/PRD_V1.0.md)
- [Software Requirements Specification (SRS V1.0)](./docs/SRS_V1.0.md)
- [System Architecture Specification V1.0](./docs/System_Architecture_V1.0.md)
- [Database Design Specification V1.0](./docs/Database_Design_V1.0.md)
- [API Specification V1.0](./docs/API_Specification_V1.0.md)

---

## 🗺️ Milestone Roadmap

| Milestone | Scope | Status |
| :--- | :--- | :---: |
| **M1** | Repository & Project Architecture | ✅ Complete |
| **M2** | Express Backend Foundation | ⏳ Pending |
| **M3** | PostgreSQL + PostGIS Foundation | ⏳ Pending |
| **M4** | Authentication + RBAC | ⏳ Pending |
| **M5** | Tree + Plantation Registration Backend | ⏳ Pending |
| **M6** | Map + Geospatial Backend | ⏳ Pending |
| **M7** | Environmental Information Integration | ⏳ Pending |
| **M8** | Deterministic Suitability Engine | ⏳ Pending |
| **M9** | Manual Verification Workflow | ⏳ Pending |
| **M10** | Tree ID, QR & Public Profile Backend | ⏳ Pending |
| **M11** | Health Monitoring Backend | ⏳ Pending |
| **M12** | Rewards + Dashboard Backend | ⏳ Pending |
| **M13** | Frontend Foundation | ⏳ Pending |
| **M14** | Frontend Map & Information Experience | ⏳ Pending |
| **M15** | Frontend Plantation, Verification & Tree ID Flow | ⏳ Pending |
| **M16** | Health Monitoring UI + Final E2E Integration | ⏳ Pending |
