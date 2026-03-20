# Wholesale E-Commerce Platform

A comprehensive wholesale e-commerce platform with Node.js backend API and Flutter mobile app, built for mobile accessories wholesale business.

## 🚀 Features

### Backend API
- **Multi-tier User System**: Admin, Employee, and Customer roles with appropriate permissions
- **Product Catalog Management**: Complete CRUD operations for mobile accessories inventory
- **Wholesale Pricing Engine**: Dynamic pricing with discount codes and bulk pricing
- **Order Management**: Real-time order tracking and status updates
- **Inventory Management**: Real-time stock tracking with low-stock alerts
- **Transaction Processing**: Secure payment processing with audit trails
- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: API protection against abuse
- **System Health Monitoring**: Real-time system health and performance monitoring

### Mobile App (Flutter)
- **Cross-platform**: iOS and Android support
- **BLoC Architecture**: State management with BLoC pattern
- **Offline Support**: Works offline with sync capabilities
- **Real-time Updates**: Live order tracking and notifications
- **Admin Dashboard**: Complete admin interface for business management
- **Employee Interface**: Limited access for employee operations
- **Customer App**: Shopping cart, checkout, and order tracking

### Mobile Web App
- **Progressive Web App**: Works on any mobile browser
- **Responsive Design**: Optimized for mobile devices
- **Add to Home Screen**: App-like experience
- **Real-time Shopping**: Live product catalog and cart

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Testing**: Jest with fast-check for property-based testing
- **Logging**: Winston
- **Security**: Helmet, CORS, Rate Limiting

### Mobile App
- **Framework**: Flutter
- **State Management**: BLoC
- **Local Storage**: Hive
- **HTTP Client**: Dio
- **Navigation**: GoRouter
- **Offline Support**: Custom offline manager

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (v6 or higher)
- Flutter SDK (for mobile app)

### Backend Setup
```bash
npm install
npm run build
npm start
```

### Mobile App Setup
```bash
cd mobile
flutter pub get
flutter run
```

### Environment Variables
```env
NODE_ENV=production
PORT=10000
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=your-jwt-secret
```

## 📱 Live Demo

- **Backend API**: [Deployed on Render]
- **Mobile Web App**: [Access from any mobile browser]
- **Admin Dashboard**: Full business management interface
- **Customer App**: Shopping and order tracking

## 🏗️ Project Structure

```
├── src/                 # Backend API source
├── mobile/              # Flutter mobile app
├── public/              # Static files and mobile web app
├── .kiro/               # Spec-driven development files
└── docs/                # Documentation
```

## 🧪 Testing

The project includes comprehensive testing:
- **Unit Tests**: Jest-based unit testing
- **Property-Based Tests**: Fast-check for universal properties
- **Integration Tests**: End-to-end API testing
- **Mobile Tests**: Flutter widget and integration tests

## 🔒 Security Features

- JWT Authentication with refresh tokens
- Password hashing with bcrypt
- Rate limiting and CORS protection
- Input validation and sanitization
- Comprehensive error handling
- System health monitoring

## 📊 System Monitoring

- Real-time health checks
- Performance optimization
- Memory and network monitoring
- Automated system diagnostics
- Error tracking and reporting

## 🚀 Deployment

### Backend (Render)
1. Connect GitHub repository
2. Set environment variables
3. Deploy automatically

### Mobile App
- **Android**: Build APK and install
- **iOS**: Build and deploy through Xcode
- **Web**: Access through browser

## 📄 License

This project is licensed under the MIT License.
