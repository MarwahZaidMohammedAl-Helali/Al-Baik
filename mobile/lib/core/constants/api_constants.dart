class ApiConstants {
  // Base URL - Update this to match your backend server
  static const String baseUrl = 'http://localhost:3000/api';
  
  // Authentication endpoints
  static const String login = '/auth/login';
  static const String register = '/auth/register';
  static const String refreshToken = '/auth/refresh';
  static const String logout = '/auth/logout';
  
  // User endpoints
  static const String users = '/users';
  static const String userProfile = '/users/profile';
  
  // Product endpoints
  static const String products = '/products';
  static const String productSearch = '/products/search';
  static const String productCategories = '/products/categories';
  
  // Order endpoints
  static const String orders = '/orders';
  static const String orderTracking = '/orders/tracking';
  
  // Transaction endpoints
  static const String transactions = '/transactions';
  
  // Inventory endpoints
  static const String inventory = '/inventory';
  
  // Pricing endpoints
  static const String pricing = '/pricing';
  static const String discountCodes = '/discount-codes';
  
  // Notification endpoints
  static const String notifications = '/notifications';
  
  // Audit endpoints
  static const String audit = '/audit';
}