# 🛒 Wholesale E-Commerce Platform

A comprehensive wholesale e-commerce platform built with Node.js, Express, MongoDB, and Flutter.

## 🚀 Features

- **User Management**: Admin, Employee, and Customer roles
- **Product Catalog**: Complete product management with categories
- **Pricing Engine**: Wholesale vs retail pricing with discount codes
- **Inventory Management**: Real-time stock tracking and alerts
- **Order Management**: Complete order lifecycle with tracking
- **Payment Processing**: Secure transaction handling
- **Mobile App**: Flutter mobile application
- **System Monitoring**: Health checks and performance optimization

## 🏗️ Architecture

### Backend (Node.js + Express)
- RESTful API with TypeScript
- MongoDB with Mongoose ODM
- JWT Authentication
- Role-based authorization
- Comprehensive error handling
- Rate limiting and security middleware

### Frontend (Flutter)
- BLoC state management
- Offline functionality
- Push notifications
- Admin and employee dashboards
- Customer shopping interface

## 🛠️ Tech Stack

**Backend:**
- Node.js + Express.js
- TypeScript
- MongoDB + Mongoose
- JWT Authentication
- bcryptjs for password hashing
- Winston for logging
- Jest + fast-check for testing

**Frontend:**
- Flutter
- BLoC pattern
- HTTP client
- Local storage (Hive)
- Push notifications

## 📱 Mobile Web App

Access the mobile-optimized web version at `/mobile` endpoint.

## 🚀 Deployment

### Environment Variables
```env
NODE_ENV=production
PORT=10000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Build Commands
```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start production server
npm start

# Development mode
npm run dev
```

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Products
- `GET /api/products` - Get all products
- `POST /api/products` - Create product (Admin)
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Orders
- `GET /api/orders` - Get user orders
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id/status` - Update order status

### Inventory
- `GET /api/inventory` - Get inventory status
- `PUT /api/inventory/:id` - Update stock levels
- `GET /api/inventory/alerts` - Get low stock alerts

## 🔒 Security Features

- Helmet.js for security headers
- CORS configuration
- Rate limiting
- Input sanitization
- JWT token authentication
- Password hashing with bcrypt
- Request validation

## 📈 Monitoring

- Health check endpoint: `/health`
- System status monitoring
- Performance optimization
- Error logging and tracking

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run property-based tests
npm run test:properties
```

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📞 Support

For support and questions, please open an issue in the GitHub repository.