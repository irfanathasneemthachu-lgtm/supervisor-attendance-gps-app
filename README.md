# Supervisor Attendance & GPS Verification App

A modern, professional workforce management application that tracks supervisor attendance and verifies physical presence at assigned workplaces using GPS.

## Features

✅ **Event-Based Location Tracking**
- GPS captured only at Clock In and Clock Out
- No continuous background tracking
- Privacy-first design

✅ **Supervisor Features**
- Secure login with Employee ID
- Personal attendance dashboard
- Clock In/Out with GPS verification
- Attendance history
- Location verification status

✅ **Admin Dashboard**
- Real-time supervisor monitoring
- Attendance records and history
- Workplace management
- Supervisor management
- Map view with GPS coordinates
- Comprehensive reporting (CSV, Excel)
- Alerts and notifications

✅ **Security**
- JWT authentication
- Role-based access control
- Server-side timestamps
- Protection against GPS tampering
- Audit logs

## Tech Stack

**Backend:**
- Node.js + Express
- MongoDB
- JWT Authentication
- Geolib for distance calculations

**Frontend:**
- React + TypeScript
- Vite
- TailwindCSS
- Leaflet Maps
- React Query

## Installation

```bash
# Install root dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..

# Install server dependencies
cd server
npm install
cd ..
```

## Environment Variables

Create `.env` files in root and server directories:

```env
# .env
VITE_API_URL=http://localhost:5000/api

# server/.env
MONGODB_URI=mongodb://localhost:27017/attendance
JWT_SECRET=your_jwt_secret_key_here
PORT=5000
NODE_ENV=development
GEOFENCE_RADIUS=100
```

## Running the Application

```bash
# Development (runs both server and client)
npm run dev

# Production
npm run build
npm start
```

## Project Structure

```
.
├── server/                 # Backend API
│   ├── models/            # MongoDB schemas
│   ├── controllers/       # Route handlers
│   ├── middleware/        # Auth & validation
│   ├── routes/            # API endpoints
│   ├── utils/             # Helper functions
│   ├── scripts/           # Seed data
│   └── index.js           # Server entry
├── client/                # Frontend React app
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom hooks
│   │   ├── services/      # API calls
│   │   ├── types/         # TypeScript types
│   │   └── App.tsx        # Main app
│   └── vite.config.ts
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Supervisor/Admin login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Attendance (Supervisor)
- `POST /api/attendance/clock-in` - Clock in with GPS
- `POST /api/attendance/clock-out` - Clock out with GPS
- `GET /api/attendance/today` - Today's attendance
- `GET /api/attendance/history` - Attendance history

### Admin - Attendance
- `GET /api/admin/attendance` - All attendance records
- `GET /api/admin/attendance/:id` - Single record
- `GET /api/admin/attendance/export/csv` - Export as CSV
- `GET /api/admin/attendance/export/excel` - Export as Excel

### Admin - Supervisors
- `GET /api/admin/supervisors` - List all supervisors
- `POST /api/admin/supervisors` - Create supervisor
- `PUT /api/admin/supervisors/:id` - Update supervisor
- `DELETE /api/admin/supervisors/:id` - Deactivate supervisor

### Admin - Workplaces
- `GET /api/admin/workplaces` - List all workplaces
- `POST /api/admin/workplaces` - Create workplace
- `PUT /api/admin/workplaces/:id` - Update workplace
- `DELETE /api/admin/workplaces/:id` - Delete workplace

## Core Logic

### Clock In Process
1. Supervisor clicks "📍 CLOCK IN"
2. App requests location permission
3. GPS coordinates captured (latitude, longitude, accuracy)
4. Distance calculated from assigned workplace
5. Verification status determined (within/outside geofence)
6. Record saved with server timestamp

### Clock Out Process
1. Supervisor clicks "🟢 CLOCK OUT"
2. App requests NEW GPS location (not reusing Clock In)
3. Distance calculated from assigned workplace
4. Verification status determined
5. Working hours calculated automatically
6. Record completed and saved

## Privacy

This application implements **privacy-first location tracking**:
- Location is captured ONLY when supervisor explicitly clicks Clock In or Clock Out
- NO background location tracking during working hours
- NO continuous location monitoring
- Clear privacy notice displayed in app

## License

MIT
