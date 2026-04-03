import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/bloc/auth_bloc.dart';
import '../../features/auth/presentation/pages/login_page.dart';
import '../../features/auth/presentation/pages/register_page.dart';
import '../../features/home/presentation/pages/home_page.dart';
import '../../features/products/presentation/pages/products_page.dart';
import '../../features/products/presentation/pages/product_detail_page.dart';
import '../../features/cart/presentation/pages/cart_page.dart';
import '../../features/orders/presentation/pages/order_history_page.dart';
import '../../features/orders/presentation/pages/order_detail_page.dart';
import '../../features/checkout/presentation/pages/checkout_page.dart';
import '../../features/checkout/presentation/pages/order_confirmation_page.dart';
import '../../features/admin/presentation/pages/admin_dashboard_page.dart';
import '../../features/admin/presentation/pages/admin_product_management_page.dart';
import '../../features/admin/presentation/pages/add_product_page.dart';
import '../../features/admin/presentation/pages/add_category_page.dart';
import '../../features/admin/presentation/pages/admin_user_management_page.dart';
import '../../features/admin/presentation/pages/admin_inventory_management_page.dart';
import '../../features/employee/presentation/pages/employee_dashboard_page.dart';
import '../../features/employee/presentation/pages/employee_product_management_page.dart';
import '../../features/employee/presentation/pages/employee_inventory_page.dart';
import '../../features/employee/presentation/pages/employee_order_management_page.dart';
import '../../features/profile/presentation/pages/profile_page.dart';
import '../../features/splash/presentation/pages/splash_page.dart';

class AppRouter {
  static GoRouter router(BuildContext context) => GoRouter(
    initialLocation: '/',
    redirect: (context, state) {
      final authState = context.read<AuthBloc>().state;
      final isAuthRoute = state.fullPath?.startsWith('/auth') ?? false;
      final isSplashRoute = state.fullPath == '/splash';
      
      // Show splash screen while loading or initial
      if (authState is AuthLoading || authState is AuthInitial) {
        return isSplashRoute ? null : '/splash';
      }
      
      final isAuthenticated = authState is AuthAuthenticated;
      
      // If not authenticated and not on auth route, redirect to login
      if (!isAuthenticated && !isAuthRoute && !isSplashRoute) {
        return '/auth/login';
      }
      
      // If authenticated and on auth route or splash, redirect to home
      if (isAuthenticated && (isAuthRoute || isSplashRoute)) {
        return '/';
      }
      
      return null;
    },
    routes: [
      // Splash route
      GoRoute(
        path: '/splash',
        name: 'splash',
        builder: (context, state) => const SplashPage(),
      ),
      
      // Auth routes
      GoRoute(
        path: '/auth/login',
        name: 'login',
        builder: (context, state) => const LoginPage(),
      ),
      GoRoute(
        path: '/auth/register',
        name: 'register',
        builder: (context, state) => const RegisterPage(),
      ),
      
      // Main app routes
      ShellRoute(
        builder: (context, state, child) {
          return MainShell(child: child);
        },
        routes: [
          GoRoute(
            path: '/',
            name: 'home',
            builder: (context, state) => const HomePage(),
          ),
          GoRoute(
            path: '/products',
            name: 'products',
            builder: (context, state) => const ProductsPage(),
            routes: [
              GoRoute(
                path: '/:productId',
                name: 'product-detail',
                builder: (context, state) {
                  final productId = state.pathParameters['productId']!;
                  return ProductDetailPage(productId: productId);
                },
              ),
            ],
          ),
          GoRoute(
            path: '/cart',
            name: 'cart',
            builder: (context, state) => const CartPage(),
          ),
          GoRoute(
            path: '/orders',
            name: 'orders',
            builder: (context, state) => const OrderHistoryPage(),
            routes: [
              GoRoute(
                path: '/:orderId',
                name: 'order-detail',
                builder: (context, state) {
                  final orderId = state.pathParameters['orderId']!;
                  return OrderDetailPage(orderId: orderId);
                },
              ),
            ],
          ),
          GoRoute(
            path: '/checkout',
            name: 'checkout',
            builder: (context, state) => const CheckoutPage(),
            routes: [
              GoRoute(
                path: '/confirmation/:orderId',
                name: 'order-confirmation',
                builder: (context, state) {
                  final orderId = state.pathParameters['orderId']!;
                  return OrderConfirmationPage(orderId: orderId);
                },
              ),
            ],
          ),
          GoRoute(
            path: '/profile',
            name: 'profile',
            builder: (context, state) => const ProfilePage(),
          ),
          
          // Admin routes
          GoRoute(
            path: '/admin',
            name: 'admin',
            builder: (context, state) => const AdminDashboardPage(),
            routes: [
              GoRoute(
                path: '/products',
                name: 'admin-products',
                builder: (context, state) => const AdminProductManagementPage(),
                routes: [
                  GoRoute(
                    path: '/add',
                    name: 'admin-add-product',
                    builder: (context, state) => const AddProductPage(),
                  ),
                ],
              ),
              GoRoute(
                path: '/categories',
                name: 'admin-categories',
                builder: (context, state) => const AddCategoryPage(),
              ),
              GoRoute(
                path: '/users',
                name: 'admin-users',
                builder: (context, state) => const AdminUserManagementPage(),
              ),
              GoRoute(
                path: '/inventory',
                name: 'admin-inventory',
                builder: (context, state) => const AdminInventoryManagementPage(),
              ),
            ],
          ),
          
          // Employee routes
          GoRoute(
            path: '/employee',
            name: 'employee',
            builder: (context, state) => const EmployeeDashboardPage(),
            routes: [
              GoRoute(
                path: '/products',
                name: 'employee-products',
                builder: (context, state) => const EmployeeProductManagementPage(),
              ),
              GoRoute(
                path: '/inventory',
                name: 'employee-inventory',
                builder: (context, state) => const EmployeeInventoryPage(),
              ),
              GoRoute(
                path: '/orders',
                name: 'employee-orders',
                builder: (context, state) => const EmployeeOrderManagementPage(),
              ),
            ],
          ),
        ],
      ),
    ],
  );
}

class MainShell extends StatelessWidget {
  final Widget child;
  
  const MainShell({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: child,
      bottomNavigationBar: BottomNavigationBar(
        type: BottomNavigationBarType.fixed,
        currentIndex: _getCurrentIndex(context),
        onTap: (index) => _onItemTapped(context, index),
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.home),
            label: 'Home',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.inventory),
            label: 'Products',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.shopping_cart),
            label: 'Cart',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.receipt_long),
            label: 'Orders',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
  
  int _getCurrentIndex(BuildContext context) {
    final location = GoRouterState.of(context).fullPath ?? '/';
    if (location.startsWith('/products')) return 1;
    if (location.startsWith('/cart')) return 2;
    if (location.startsWith('/orders')) return 3;
    if (location.startsWith('/profile')) return 4;
    return 0; // Home
  }
  
  void _onItemTapped(BuildContext context, int index) {
    switch (index) {
      case 0:
        context.goNamed('home');
        break;
      case 1:
        context.goNamed('products');
        break;
      case 2:
        context.goNamed('cart');
        break;
      case 3:
        context.goNamed('orders');
        break;
      case 4:
        context.goNamed('profile');
        break;
    }
  }
}