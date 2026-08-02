# 🏡 Ashiyana - Premium Goa Real Estate Platform

> A modern full-stack real estate platform built for buying, selling, and renting premium properties across Goa, India.

![Python](https://img.shields.io/badge/Python-3.12-blue?style=for-the-badge&logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql)
![PostGIS](https://img.shields.io/badge/PostGIS-Spatial-green?style=for-the-badge)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)
![Vite](https://img.shields.io/badge/Vite-Frontend-646CFF?style=for-the-badge&logo=vite)
![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?style=for-the-badge&logo=docker)
![License](https://img.shields.io/badge/License-MIT-success?style=for-the-badge)

---

# 📖 About

Ashiyana is a modern real estate platform designed specifically for the Goa property market.

Unlike generic listing websites, Ashiyana focuses on premium residential and commercial properties while providing secure broker management, NRI-friendly listings, property intelligence, and map-based discovery.

The platform is being developed as a production-ready application with scalability, security, and modern architecture in mind.

---

# ✨ Features

### 🏠 Property Listings

- Buy, Sell & Rent properties
- Residential & Commercial listings
- Advanced property filters
- Featured properties
- Property details page
- Property status management

---

### 👤 Authentication

- JWT Authentication
- Google OAuth Login
- Refresh Tokens
- Role-based Authorization

Roles:

- 👑 Broker
- 👤 Registered User
- 🌍 Public Visitor

---

### ❤️ User Features

- Save/Favorite Properties
- Property Search
- Property Filters
- Secure User Accounts
- NRI Mode

---

### 👑 Broker Features

- Add Property
- Edit Property
- Delete Property
- Manage Listings
- View Property Watchers
- Manage Enquiries

---

### 🌍 Goa-specific Intelligence

- Goa Region Classification
- Beach Distance
- Airport Distance
- Tourist Density
- Connectivity Score
- NRI Eligibility
- FEMA Compliance
- Short-term Rental Potential

---

### 🗺️ Location Features

- Approximate Property Map
- Exact Broker-only Coordinates
- PostGIS Spatial Database
- Secure Address Handling

---

### 🔒 Security

- Password Hashing
- JWT Authentication
- Protected Routes
- Broker-only APIs
- Hidden Exact Locations
- Role-based Permissions

---

# 🛠 Tech Stack

## Backend

- FastAPI
- SQLAlchemy
- Alembic
- PostgreSQL
- PostGIS
- GeoAlchemy2
- Pydantic v2
- JWT
- OAuth2
- Docker

## Frontend

- React
- TypeScript
- Vite

## Database

- PostgreSQL
- PostGIS

## DevOps

- Docker
- Docker Compose
- Alembic Migrations

---

# 📂 Project Structure

```
ashiyana/
│
├── app/
│   ├── api/
│   ├── core/
│   ├── db/
│   ├── models/
│   ├── schemas/
│   ├── services/
│   └── main.py
│
├── frontend/
│
├── tests/
│
├── docker-compose.yml
├── requirements.txt
└── README.md
```

---

# 🗄 Database

Current entities:

- Users
- Properties
- Property Images
- Property Documents
- Saved Properties
- Enquiries
- Seller Submissions
- Valuations

---

# 🔌 API Highlights

Authentication

```
POST /auth/register
POST /auth/login
POST /auth/google
POST /auth/refresh
GET  /auth/me
```

Properties

```
GET    /properties
GET    /properties/{id}
POST   /properties
PATCH  /properties/{id}
DELETE /properties/{id}
```

Saved Properties

```
POST   /properties/{id}/save
DELETE /properties/{id}/save
GET    /properties/saved/mine
```

---

# 🚀 Getting Started

## Clone Repository

```bash
git clone https://github.com/sanashk19/ashiyana-real-estate.git
```

```
cd ashiyana-real-estate
```

---

## Backend

Install dependencies

```bash
pip install -r requirements.txt
```

Run Docker

```bash
docker compose up --build
```

Backend:

```
http://localhost:8000
```

Swagger Docs:

```
http://localhost:8000/docs
```

---

## Frontend

```bash
cd frontend
```

```bash
npm install
```

```bash
npm run dev
```

---

# 📸 Screenshots

## Home Page

> *(Coming Soon)*

---

## Property Listings

> *(Coming Soon)*

---

## Property Details

> *(Coming Soon)*

---

## Broker Dashboard

> *(Coming Soon)*

---

# 🚧 Upcoming Features

- Cloudinary Image Upload
- Multiple Property Images
- Property Videos
- Interactive Maps
- AI Property Recommendation
- WhatsApp Integration
- Email Notifications
- Mortgage Calculator
- Admin Dashboard
- Analytics Dashboard
- Property Comparison
- Advanced Search
- Nearby Amenities
- Virtual Tours

---

# 📈 Current Progress

- ✅ Backend Architecture
- ✅ JWT Authentication
- ✅ Role-based Authorization
- ✅ Property CRUD
- ✅ Search & Filters
- ✅ Docker Setup
- ✅ PostgreSQL
- ✅ PostGIS
- ✅ Alembic Migrations
- 🔄 Frontend Development
- 🔄 Cloudinary Integration
- 🔄 Maps Integration
- 🔄 Deployment

---

# 👩‍💻 Author

**Sana Shaikh**

Computer Engineering Student

Built with ❤️ using FastAPI, React and PostgreSQL.

GitHub:
https://github.com/sanashk19

---

# ⭐ Support

If you found this project interesting, consider giving it a ⭐ on GitHub.
