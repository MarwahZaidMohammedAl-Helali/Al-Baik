# Wholesale E-Commerce Backend API

A comprehensive backend API for a wholesale mobile accessories e-commerce platform, built with Node.js, Express.js, TypeScript, and MongoDB.

## Features

- **Multi-tier User System**: Admin, Employee, and Customer roles with appropriate permissions
- **Product Catalog Management**: Complete CRUD operations for mobile accessories inventory
- **Wholesale Pricing Engine**: Dynamic pricing with discount codes and bulk pricing
- **Order Management**: Real-time order tracking and status updates
- **Inventory Management**: Real-time stock tracking with low-stock alerts
- **Transaction Processing**: Secure payment processing with audit trails
- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: API protection against abuse
- **Comprehensive Logging**: Winston-based logging system
- **Property-Based Testing**: Fast-check integration for robust testing

## Technology Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Testing**: Jest with fast-check for property-based testing
- **Logging**: Winston
- **Security**: Helmet, CORS, Rate Limiting
- **Validation**: Express Validator

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- MongoDB (v6 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd wholesale-ecommerce-backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Start MongoDB (if running locally):
   ```bash
   mongod
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

### Environment Variables

Copy `.env.example` to `.env` and configure the following variables:

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production/test)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `JWT_REFRESH_SECRET`: Secret key for refresh tokens
- `BCRYPT_ROUNDS`: Number of bcrypt rounds for password hashing

### Available Scripts

- `npm run dev`: Start development server with hot reload
- `npm run build`: Build the TypeScript project
- `npm start`: Start production server
- `npm test`: Run test suite
- `npm run test:watch`: Run tests in watch mode
- `npm run test:coverage`: Run tests with coverage report

## API Documentation

### Health Check

```
GET /health
```

Returns server status and basic information.

### Authentication Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - User logout

### User Management

- `GET /api/users` - Get all users (Admin only)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (Admin only)

### Product Catalog

- `GET /api/products` - Get products with filtering and pagination
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create product (Admin/Employee)
- `PUT /api/products/:id` - Update product (Admin/Employee)
- `DELETE /api/products/:id` - Delete product (Admin only)

### Order Management

- `GET /api/orders` - Get user orders
- `GET /api/orders/:id` - Get order by ID
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id/status` - Update order status (Admin/Employee)

## Project Structure

```
src/
├── config/          # Configuration files
├── controllers/     # Route controllers
├── middleware/      # Express middleware
├── models/          # Mongoose models
├── routes/          # API routes
├── services/        # Business logic services
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
├── test/            # Test setup and utilities
└── server.ts        # Application entry point
```

## Testing

The project uses Jest for unit testing and fast-check for property-based testing:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Property-Based Testing

Property-based tests validate universal properties across many generated inputs:

```typescript
// Example property test
test('pricing tier consistency', async () => {
  await fc.assert(fc.asyncProperty(
    fc.record({
      product: productGenerator(),
      customerType: fc.constantFrom('retail', 'wholesale')
    }),
    async ({ product, customerType }) => {
      const price = await pricingEngine.calculatePrice(product.id, customerType);
      expect(price.finalPrice).toBeGreaterThan(0);
    }
  ), { numRuns: 100 });
});
```

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with configurable rounds
- **Rate Limiting**: Configurable request rate limiting
- **CORS Protection**: Cross-origin request security
- **Helmet Security**: Security headers and protection
- **Input Validation**: Request validation and sanitization
- **Error Handling**: Secure error responses without information leakage

## Logging

The application uses Winston for comprehensive logging:

- **Development**: Console output with colors
- **Production**: File-based logging with rotation
- **Error Tracking**: Separate error logs with stack traces
- **Request Logging**: API request and response logging

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.