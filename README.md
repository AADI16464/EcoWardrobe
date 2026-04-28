# 🌿 EcoWardrobe – Sustainable Circular Marketplace

A full-stack web application for **reselling, refurbishing, and donating** pre-loved clothing and electronics. Powered by an AI condition-scoring engine.

---

## 📁 Project Structure

```
WebPage/
├── frontend/              # React + Tailwind (Vite)
│   ├── src/
│   │   ├── api/           # Axios API client
│   │   ├── components/    # Navbar, Footer, ProductCard
│   │   ├── pages/         # Home, Shop, Upload, Dashboard
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── backend/               # Node.js + Express + MongoDB
│   ├── config/db.js       # MongoDB connection
│   ├── middleware/upload.js# Multer image upload
│   ├── models/
│   │   ├── Item.js        # Item schema
│   │   └── User.js        # User schema
│   ├── routes/api.js      # All API routes
│   ├── utils/aiLogic.js   # AI condition → decision engine
│   ├── server.js          # Express entry point
│   ├── .env               # Environment variables
│   └── package.json
│
└── setup.ps1              # Auto-install script
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** v18+ – [nodejs.org](https://nodejs.org)
- **MongoDB** – Local (`mongod`) or [Atlas free tier](https://cloud.mongodb.com)

> ⚠️ If npm is broken, run: `winget install OpenJS.NodeJS.LTS` to reinstall Node.

### 1. Run the setup script
```powershell
cd "C:\Users\ASUS\Desktop\WebPage"
.\setup.ps1
```

### 2. Configure MongoDB (optional)
Edit `backend/.env`:
```env
MONGO_URI=mongodb://localhost:27017/ecowardrobe   # local
# or
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/ecowardrobe
```

### 3. Start both servers

**Terminal 1 – Backend:**
```powershell
cd backend
npm run dev
# → http://localhost:5000
```

**Terminal 2 – Frontend:**
```powershell
cd frontend
npm run dev
# → http://localhost:3000
```

---

## 🔌 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/upload-item` | Upload item with AI analysis |
| GET | `/api/items` | List items (filters: category, price, decision) |
| GET | `/api/items/:id` | Get single item |
| POST | `/api/buy-item` | Purchase an item |
| GET | `/api/user/dashboard` | User dashboard data |
| GET | `/api/stats` | Platform-wide impact stats |

---

## 🤖 AI Logic

```
condition_score ∈ [0, 1]

IF score > 0.7  → RESELL
IF score > 0.4  → REFURBISH
ELSE            → DONATE

price = base_price[category] × condition_score
```

### Base Prices (INR)
| Category | Base Price |
|----------|------------|
| Clothing | ₹600 |
| Electronics | ₹2,500 |
| Accessories | ₹400 |
| Footwear | ₹800 |

---

## 🌐 Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Home | Hero, services, impact stats |
| `/shop` | Shop | Product grid with filters |
| `/upload` | Upload | AI-powered item submission |
| `/dashboard` | Dashboard | Earnings, CO₂, items, certs |

---

## 🎨 Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS v3 |
| Routing | React Router v6 |
| HTTP Client | Axios |
| Backend | Node.js + Express |
| Database | MongoDB + Mongoose |
| File Upload | Multer |
| Icons | Lucide React |

---

## 💡 Features

- ✅ AI condition scoring with real-time preview
- ✅ Image upload with drag & drop
- ✅ Full filtering (category, price, decision type)
- ✅ Buy items with instant DB update
- ✅ Dashboard with earnings, CO₂ tracking, certificates
- ✅ Mock fallback data when backend is offline
- ✅ Responsive mobile-first design
- ✅ Animated hero with live stats counters
- ✅ Glass-morphism dark eco theme

---

## 🌱 Environment Variables

**backend/.env**
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/ecowardrobe
NODE_ENV=development
```
