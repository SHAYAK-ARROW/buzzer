import codecs

readme_content = """# 🐝 Buzzer - Advanced Hyperlocal Delivery Platform

Buzzer is a highly secure, real-time, multi-vendor hyperlocal delivery platform. It is designed to handle the complex logistics of food and grocery delivery, featuring a robust multi-role architecture (Admin, Seller, Delivery Partner, and Buyer).

## 🚀 Tech Stack

### Backend
* **Framework:** Python, Flask
* **Database & ORM:** PostgreSQL (via Supabase), Flask-SQLAlchemy
* **Authentication:** Flask-JWT-Extended, Google OAuth
* **Real-time:** Flask-SocketIO (WebSockets)
* **Background Jobs:** APScheduler
* **Architecture:** RESTful API, Escrow Wallet System

### Frontend
* **Framework:** React.js (Vite)
* **State Management:** TanStack React Query
* **Routing:** React Router DOM
* **UI/UX:** SweetAlert2, Chart.js for analytics
* **Real-time:** socket.io-client
* **PWA:** Vite PWA Support

---

## 🛡️ Key Features & Security Anti-Fraud Mechanisms

Buzzer was built with strict financial integrity and fraud prevention at its core.

### 1. Zero-Liability 'Cash Purchase' Model
To prevent delivery partners from absconding with Cash on Delivery (COD) funds, Buzzer implements a unique model where Delivery Boys effectively "purchase" the inventory from the seller upfront using physical cash or virtual wallet balance. They then collect the final amount directly from the buyer.

### 2. Geofenced Delivery Actions
Delivery partners are mathematically blocked (using Haversine GPS calculations) from marking orders as "Picked Up" or "Delivery Attempt Failed" unless they are physically within a **500-meter radius** of the shop or the customer.

### 3. Bulletproof Escrow & Wallet System
* **Floating-Point Theft Prevention:** Strict rounding ound(amount, 2) at the database level to prevent fractional withdrawal exploits.
* **Discount Alignment:** Seller-provided discounts (Cart Discounts, Free Delivery) are correctly deducted from the seller's items_total to ensure the platform and delivery partners do not bear the cost of seller promotions.
* **Penalty Loops:** Delivery partners face a 10% penalty for endlessly dropping/unassigning orders.

### 4. Spam & Rate Limiting
* **OTP Cooldowns:** 60-second strict cooldown on all Email OTP routes to prevent email server DDoS attacks.
* **Withdrawal Limits:** Minimum withdrawal thresholds and pending-request locks to prevent spamming the admin dashboard.
* **GPS Throttling:** Frontend watchPosition throttled to 30-second intervals to prevent database connection pool exhaustion.

### 5. Advanced Order Workflow
* **Partial Approvals:** If a shop is out of an item, they can remove it. The system dynamically recalculates totals and automatically re-applies any qualifying discount thresholds before sending it back to the buyer for final approval.

---

## 💻 Local Development Setup

### Prerequisites
* Python 3.10+
* Node.js 18+
* PostgreSQL Database (e.g., Supabase)

### 1. Backend Setup
\\\ash
# Clone the repository and navigate to the backend
cd buzzer-backend

# Create a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create a .env file based on environment variables needed
# DATABASE_URL=postgresql://user:pass@host:6543/postgres
# SECRET_KEY=your_secret_key
# JWT_SECRET_KEY=your_jwt_secret

# Run the backend server
python run.py
\\\

### 2. Frontend Setup
\\\ash
# Navigate to the frontend directory
cd buzzer-frontend

# Install dependencies
npm install

# Create a .env file
# VITE_API_URL=http://localhost:5000/api
# VITE_SOCKET_URL=http://localhost:5000

# Run the development server
npm run dev
\\\

---

## 👥 Roles & Dashboard Highlights

1. **Admin:** Full control over users, shops, global system settings (delivery base fares, per-km rates), and withdrawal approvals.
2. **Seller (Shop):** Manage inventory, toggle shop active status, approve partial orders, and track revenue charts.
3. **Delivery Partner:** Real-time Haversine-filtered available orders map, wallet tracking, and automated settlement tracking.
4. **Buyer:** Real-time WebSocket map tracking of delivery boy, cart management, and profile management.
"""

with codecs.open('README.md', 'w', 'utf-8') as f:
    f.write(readme_content)
print("README created successfully!")
