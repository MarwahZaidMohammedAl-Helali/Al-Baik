# Al-Baik E-commerce Platform

A full-stack e-commerce platform with mobile app and web interface, built with modern technologies.

## 🏗️ Architecture

- **Backend**: Cloudflare Workers + Turso (SQLite) + R2 Storage
- **Mobile App**: Flutter (existing)
- **Web App**: Next.js + React + Tailwind CSS
- **Database**: Turso (Global SQLite with edge replicas)
- **Storage**: Cloudflare R2 (Images & Videos)
- **API**: RESTful API with JWT authentication

## 🚀 Features

### Mobile App (Flutter)
- ✅ Product catalog with videos and images
- ✅ Shopping cart functionality
- ✅ User authentication (customer/staff/admin)
- ✅ Arabic RTL interface
- ✅ Shopee-style design
- ✅ Video product galleries

### Web App (Next.js)
- 🆕 Responsive web interface
- 🆕 Admin panel for product management
- 🆕 Real-time inventory management
- 🆕 Order management system
- 🆕 Customer dashboard

### Backend API (Cloudflare Workers)
- 🆕 RESTful API endpoints
- 🆕 JWT authentication
- 🆕 Role-based access control
- 🆕 File upload to R2 storage
- 🆕 Global edge deployment

## 📦 Tech Stack

### Backend
- **Cloudflare Workers**: Serverless API (100k requests/day free)
- **Turso**: SQLite database with global replicas (9GB free)
- **Cloudflare R2**: Object storage (10GB free)
- **Hono**: Fast web framework for Workers
- **Drizzle ORM**: Type-safe database queries
- **Zod**: Runtime type validation

### Frontend
- **Next.js 14**: React framework with App Router
- **Tailwind CSS**: Utility-first CSS framework
- **TypeScript**: Type safety
- **Axios**: HTTP client
- **React Hook Form**: Form handling
- **React Hot Toast**: Notifications

### Mobile
- **Flutter**: Cross-platform mobile framework
- **Dart**: Programming language
- **Video Player**: Video playback support

## 🛠️ Setup Instructions

### 1. Backend Setup (Cloudflare Workers + Turso)

#### Prerequisites
- Node.js 18+
- Cloudflare account
- Turso account

#### Steps

1. **Install Wrangler CLI**
   ```bash
   npm install -g wrangler
   wrangler login
   ```

2. **Setup Turso Database**
   ```bash
   # Install Turso CLI
   curl -sSfL https://get.tur.so/install.sh | bash
   
   # Login to Turso
   turso auth login
   
   # Create database
   turso db create al-baik-prod
   turso db create al-baik-dev
   
   # Get database URLs and tokens
   turso db show al-baik-prod
   turso db tokens create al-baik-prod
   ```

3. **Setup Cloudflare R2**
   ```bash
   # Create R2 bucket
   wrangler r2 bucket create al-baik-media
   ```

4. **Configure Environment**
   ```bash
   cd backend
   npm install
   
   # Copy and edit wrangler.toml with your database IDs
   # Add your Turso credentials to wrangler.toml
   ```

5. **Initialize Database**
   ```bash
   # Run the initialization script
   turso db shell al-baik-prod < scripts/init-db.sql
   turso db shell al-baik-dev < scripts/init-db.sql
   ```

6. **Deploy API**
   ```bash
   npm run deploy
   ```

### 2. Web App Setup (Next.js)

```bash
cd web
npm install

# Create .env.local
echo "NEXT_PUBLIC_API_URL=https://your-worker-name.your-subdomain.workers.dev" > .env.local

# Run development server
npm run dev
```

### 3. Mobile App Setup (Flutter)

The mobile app is already configured. To connect it to the new API:

1. **Update API endpoint in Flutter app**
   ```dart
   // In mobile/lib/main.dart, update the API base URL
   const String API_BASE_URL = 'https://your-worker-name.your-subdomain.workers.dev/api';
   ```

2. **Build APK**
   ```bash
   cd mobile
   flutter build apk --release
   ```

## 🔐 Authentication

### Demo Accounts
- **Admin**: admin@al-baik.com / password: (empty - will be hashed)
- **Staff**: staff@al-baik.com / password: (empty - will be hashed)  
- **Customer**: customer@al-baik.com / password: (empty - will be hashed)

### API Authentication
- JWT tokens with 7-day expiration
- Role-based access control (admin, staff, customer)
- Secure password hashing

## 📱 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user

### Products
- `GET /api/products` - List products (public)
- `GET /api/products/:id` - Get product details (public)
- `POST /api/products` - Create product (admin only)
- `PUT /api/products/:id` - Update product (admin only)
- `DELETE /api/products/:id` - Delete product (admin only)

### Categories
- `GET /api/categories` - List categories (public)
- `GET /api/categories/:id` - Get category details (public)
- `GET /api/categories/:id/products` - Get products by category (public)
- `POST /api/categories` - Create category (admin only)
- `PUT /api/categories/:id` - Update category (admin only)
- `DELETE /api/categories/:id` - Delete category (admin only)

### Orders
- `GET /api/orders` - Get user orders (authenticated)
- `POST /api/orders` - Create order (authenticated)
- `GET /api/orders/:id` - Get order details (authenticated)

### Media
- `POST /api/media/upload` - Upload files to R2 (authenticated)

### Admin
- `GET /api/admin/stats` - Dashboard statistics (admin only)

## 🎯 Product Management

### Admin Features
- ✅ Add/Edit/Delete products
- ✅ Manage categories
- ✅ Upload images and videos
- ✅ Inventory management
- ✅ Order management
- ✅ User management

### Product Data Structure
```json
{
  "id": "prod_mixer_1",
  "name": "Multi-Function Electric Mixer",
  "nameAr": "خلاط كهربائي متعدد الوظائف",
  "description": "English description",
  "descriptionAr": "الوصف بالعربية",
  "price": 299.99,
  "currency": "JOD",
  "mainImage": "https://r2-url/image.jpg",
  "images": ["https://r2-url/image1.jpg"],
  "videoUrl": "https://r2-url/video.mp4",
  "specifications": {},
  "inStock": true,
  "stockQuantity": 25,
  "rating": 4.5,
  "reviewCount": 127
}
```

## 🌐 Deployment

### Backend (Cloudflare Workers)
```bash
cd backend
npm run deploy
```

### Web App (Vercel/Netlify)
```bash
cd web
npm run build
# Deploy to your preferred platform
```

### Mobile App
```bash
cd mobile
flutter build apk --release
# APK will be in build/app/outputs/flutter-apk/
```

## 💰 Cost Breakdown (Free Tiers)

- **Cloudflare Workers**: 100,000 requests/day (FREE)
- **Turso Database**: 9GB storage, 1B reads, 25M writes/month (FREE)
- **Cloudflare R2**: 10GB storage, 1M Class A ops, 10M Class B ops (FREE)
- **Total Monthly Cost**: $0 for moderate usage

## 🔧 Configuration

### Environment Variables

#### Backend (wrangler.toml)
```toml
TURSO_DATABASE_URL = "libsql://your-db.turso.io"
TURSO_AUTH_TOKEN = "your-auth-token"
JWT_SECRET = "your-jwt-secret"
```

#### Web (.env.local)
```env
NEXT_PUBLIC_API_URL=https://your-worker.workers.dev
```

## 📊 Features Roadmap

### Phase 1 (Current)
- ✅ Basic product catalog
- ✅ User authentication
- ✅ Shopping cart
- ✅ Admin panel

### Phase 2 (Next)
- 🔄 Payment integration
- 🔄 Order tracking
- 🔄 Email notifications
- 🔄 Advanced search & filters

### Phase 3 (Future)
- 📋 Analytics dashboard
- 📋 Multi-language support
- 📋 Mobile push notifications
- 📋 Advanced inventory management

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Email: info@al-baik.com
- Phone: +962 6 123 4567

---

**Al-Baik** - Your trusted partner for electrical appliances and home electronics.