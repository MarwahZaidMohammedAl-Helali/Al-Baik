# End-to-End Integration Guide

This document explains how to use the comprehensive integration system that provides error handling, loading states, and offline functionality across the wholesale e-commerce app.

## Overview

The integration system consists of several key components:

1. **Error Handler** - Centralized error handling and user feedback
2. **Offline Manager** - Offline data caching and action queuing
3. **Loading Manager** - Loading states and indicators
4. **Integration Service** - Unified service combining all features

## Quick Start

### 1. Basic Integration in a Widget

```dart
class MyPage extends StatefulWidget {
  @override
  State<MyPage> createState() => _MyPageState();
}

class _MyPageState extends State<MyPage> with IntegrationAwareMixin {
  @override
  void onConnectivityChanged(bool isConnected) {
    if (isConnected) {
      // Refresh data when back online
      _loadData();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        children: [
          // Show offline banner when offline
          buildOfflineBanner(),
          
          // Your content here
          Expanded(
            child: _buildContent(),
          ),
        ],
      ),
    );
  }

  Widget _buildContent() {
    // Use integrated widgets for consistent UX
    if (isLoading) {
      return IntegratedLoadingWidget(
        message: isOffline ? 'Loading from cache...' : 'Loading...',
        showOfflineIndicator: isOffline,
      );
    }
    
    if (hasError) {
      return IntegratedErrorWidget(
        message: errorMessage,
        isOffline: isOffline,
        onRetry: () => _loadData(),
      );
    }
    
    return _buildSuccessContent();
  }
}
```

### 2. Execute Operations with Full Integration

```dart
Future<void> _loadData() async {
  await executeIntegratedOperation(
    operation: () => apiService.getData(),
    loadingMessage: 'Loading data...',
    successMessage: 'Data loaded successfully',
    showLoading: true,
    showSuccess: true,
    supportOffline: true,
    offlineCacheKey: 'my_data_cache',
    fromCache: (json) => MyData.fromJson(json),
    cacheMaxAge: Duration(hours: 2),
    onSuccess: () {
      // Handle success
      setState(() {
        // Update UI
      });
    },
    onError: (error) {
      // Handle error
      print('Error: $error');
    },
  );
}
```

## Components

### Error Handler

Provides centralized error handling with user-friendly messages:

```dart
// Show error as snackbar
ErrorHandler.showErrorSnackBar(context, failure);

// Show error as dialog with retry option
ErrorHandler.showErrorDialog(
  context, 
  failure, 
  onRetry: () => _retryOperation(),
);

// Build error widget
Widget errorWidget = ErrorHandler.buildErrorWidget(
  failure,
  onRetry: () => _retryOperation(),
  customMessage: 'Failed to load products',
);
```

### Offline Manager

Handles offline data caching and action queuing:

```dart
final offlineManager = sl<OfflineManager>();

// Cache data for offline access
await offlineManager.cacheData('products', productsJson);

// Get cached data
final cachedProducts = await offlineManager.getCachedData(
  'products',
  maxAge: Duration(hours: 1),
);

// Queue action for when online
await offlineManager.queueAction(OfflineAction(
  id: 'add_to_cart_123',
  type: OfflineActionType.addToCart,
  data: {'productId': '123', 'quantity': 2},
  timestamp: DateTime.now(),
));

// Execute pending actions (automatically called when back online)
await offlineManager.executePendingActions();
```

### Loading Manager

Provides various loading indicators and states:

```dart
// Show full-screen loading overlay
LoadingManager().show(context, message: 'Processing...');
LoadingManager().hide();

// Build loading widget
Widget loading = LoadingManager.buildLoadingWidget(
  message: 'Loading products...',
  color: Colors.blue,
  size: 32.0,
);

// Custom loading indicators
Widget dots = CustomLoadingIndicators.dots();
Widget pulse = CustomLoadingIndicators.pulse();
Widget wave = CustomLoadingIndicators.wave();

// Shimmer loading for placeholders
Widget shimmer = LoadingManager.buildShimmerLoading(
  child: ProductCardSkeleton(),
  isLoading: true,
);
```

### Integration Service

Unified service combining all features:

```dart
final integrationService = IntegrationService();

// Execute operation with full integration
final result = await integrationService.executeOperation<List<Product>>(
  operation: () => productRepository.getProducts(),
  context: context,
  loadingMessage: 'Loading products...',
  successMessage: 'Products loaded',
  showLoading: true,
  showSuccess: true,
  supportOffline: true,
  offlineCacheKey: 'products_cache',
  fromCache: (json) => (json['products'] as List)
      .map((p) => Product.fromJson(p))
      .toList(),
  cacheMaxAge: Duration(hours: 1),
);
```

## Offline Support

### Caching Strategy

The system supports different caching strategies:

```dart
enum CacheStrategy {
  cacheFirst,    // Use cache first, fallback to network
  networkFirst,  // Use network first, fallback to cache
  cacheOnly,     // Use cache only
  networkOnly,   // Use network only
}

final cacheManager = CacheManager(offlineManager);

final data = await cacheManager.getData<List<Product>>(
  'products',
  () => apiService.getProducts(),
  (json) => Product.fromJson(json),
  strategy: CacheStrategy.networkFirst,
  maxAge: Duration(hours: 2),
);
```

### Offline Actions

Queue actions to be executed when back online:

```dart
// Add to cart offline
await IntegrationService().queueOfflineAction(
  type: OfflineActionType.addToCart,
  data: {
    'productId': product.id,
    'quantity': quantity,
    'userId': currentUser.id,
  },
);

// Update profile offline
await IntegrationService().queueOfflineAction(
  type: OfflineActionType.updateProfile,
  data: {
    'userId': user.id,
    'name': newName,
    'email': newEmail,
  },
);
```

## Error Handling

### Automatic Retry

Operations can be automatically retried with exponential backoff:

```dart
final result = await RetryHandler.retry(
  () => apiService.getData(),
  config: RetryConfig(
    maxRetries: 3,
    delay: Duration(seconds: 1),
    maxDelay: Duration(seconds: 10),
    backoffMultiplier: 2.0,
  ),
  retryIf: RetryHandler.shouldRetry,
);
```

### Error Types

The system handles different types of errors:

- **NetworkFailure** - Connection issues, timeouts
- **ServerFailure** - Server errors (4xx, 5xx)
- **AuthFailure** - Authentication/authorization errors
- **OfflineException** - Offline-specific errors

## Best Practices

### 1. Use Integration Mixins

Always use `IntegrationAwareMixin` for pages that need offline support:

```dart
class MyPage extends StatefulWidget {
  @override
  State<MyPage> createState() => _MyPageState();
}

class _MyPageState extends State<MyPage> with IntegrationAwareMixin {
  // Automatic connectivity handling
}
```

### 2. Provide Offline Feedback

Always inform users about offline limitations:

```dart
void _onSearchPressed() {
  if (isOffline) {
    _showOfflineMessage('Search is not available offline');
    return;
  }
  
  // Proceed with search
}

void _showOfflineMessage(String message) {
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content: Row(
        children: [
          Icon(Icons.wifi_off, color: Colors.white, size: 16),
          SizedBox(width: 8),
          Expanded(child: Text(message)),
        ],
      ),
      backgroundColor: Colors.orange[600],
    ),
  );
}
```

### 3. Cache Important Data

Cache data that users might need offline:

```dart
// Cache product list
await offlineManager.cacheData('products', {
  'products': products.map((p) => p.toJson()).toList(),
  'categories': categories.map((c) => c.toJson()).toList(),
});

// Cache user profile
await offlineManager.cacheData('user_profile', user.toJson());

// Cache cart contents
await offlineManager.cacheData('cart', {
  'items': cartItems.map((i) => i.toJson()).toList(),
  'total': cartTotal,
});
```

### 4. Handle Loading States

Provide appropriate loading feedback:

```dart
Widget _buildContent() {
  if (isLoading) {
    return IntegratedLoadingWidget(
      message: isOffline 
          ? 'Loading from cache...' 
          : 'Loading latest data...',
      showOfflineIndicator: isOffline,
    );
  }
  
  // Content
}
```

### 5. Graceful Error Recovery

Always provide retry options and fallbacks:

```dart
Widget _buildErrorState() {
  return IntegratedErrorWidget(
    message: errorMessage,
    isOffline: isOffline,
    onRetry: isOffline 
        ? null  // Don't show retry when offline
        : () => _retryOperation(),
  );
}
```

## Testing

### Unit Tests

Test integration components:

```dart
void main() {
  group('IntegrationService', () {
    test('should execute operation successfully', () async {
      // Test implementation
    });
    
    test('should handle offline scenarios', () async {
      // Test offline behavior
    });
    
    test('should retry failed operations', () async {
      // Test retry logic
    });
  });
}
```

### Integration Tests

Test end-to-end flows:

```dart
void main() {
  group('Products Page Integration', () {
    testWidgets('should load products when online', (tester) async {
      // Test online behavior
    });
    
    testWidgets('should show cached products when offline', (tester) async {
      // Test offline behavior
    });
    
    testWidgets('should handle errors gracefully', (tester) async {
      // Test error handling
    });
  });
}
```

## Migration Guide

To migrate existing pages to use the integration system:

1. **Add the mixin**:
   ```dart
   class _MyPageState extends State<MyPage> with IntegrationAwareMixin
   ```

2. **Replace error handling**:
   ```dart
   // Before
   if (state is Error) {
     return Text('Error: ${state.message}');
   }
   
   // After
   if (state is Error) {
     return IntegratedErrorWidget(
       message: state.message,
       isOffline: isOffline,
       onRetry: () => _loadData(),
     );
   }
   ```

3. **Replace loading indicators**:
   ```dart
   // Before
   if (state is Loading) {
     return CircularProgressIndicator();
   }
   
   // After
   if (state is Loading) {
     return IntegratedLoadingWidget(
       message: isOffline ? 'Loading from cache...' : 'Loading...',
       showOfflineIndicator: isOffline,
     );
   }
   ```

4. **Add offline banner**:
   ```dart
   @override
   Widget build(BuildContext context) {
     return Scaffold(
       body: Column(
         children: [
           buildOfflineBanner(),  // Add this
           // Rest of your content
         ],
       ),
     );
   }
   ```

5. **Use integrated operations**:
   ```dart
   // Before
   try {
     final result = await apiService.getData();
     setState(() {
       data = result;
     });
   } catch (e) {
     setState(() {
       error = e.toString();
     });
   }
   
   // After
   await executeIntegratedOperation(
     operation: () => apiService.getData(),
     loadingMessage: 'Loading data...',
     supportOffline: true,
     offlineCacheKey: 'my_data',
     onSuccess: () {
       setState(() {
         // Update UI
       });
     },
   );
   ```

This integration system provides a robust foundation for handling network operations, offline scenarios, and user feedback throughout the application.