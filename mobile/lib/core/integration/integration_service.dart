import 'package:flutter/material.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'dart:async';

import '../offline/offline_manager.dart';
import '../error/error_handler.dart';
import '../loading/loading_manager.dart';
import '../network/network_info.dart';

class IntegrationService {
  static final IntegrationService _instance = IntegrationService._internal();
  factory IntegrationService() => _instance;
  IntegrationService._internal();

  late OfflineManager _offlineManager;
  late NetworkInfo _networkInfo;
  StreamSubscription<ConnectivityResult>? _connectivitySubscription;
  
  final StreamController<bool> _connectivityController = StreamController<bool>.broadcast();
  Stream<bool> get connectivityStream => _connectivityController.stream;

  bool _isInitialized = false;
  bool _isOnline = true;

  bool get isInitialized => _isInitialized;
  bool get isOnline => _isOnline;

  Future<void> initialize({
    required OfflineManager offlineManager,
    required NetworkInfo networkInfo,
  }) async {
    if (_isInitialized) return;

    _offlineManager = offlineManager;
    _networkInfo = networkInfo;

    // Check initial connectivity
    _isOnline = await _networkInfo.isConnected;

    // Listen to connectivity changes
    _connectivitySubscription = _offlineManager.connectivityStream.listen(
      _onConnectivityChanged,
    );

    _isInitialized = true;
  }

  void dispose() {
    _connectivitySubscription?.cancel();
    _connectivityController.close();
  }

  Future<void> _onConnectivityChanged(ConnectivityResult result) async {
    final wasOnline = _isOnline;
    _isOnline = result != ConnectivityResult.none;
    
    _connectivityController.add(_isOnline);

    // If we just came back online, execute pending actions
    if (!wasOnline && _isOnline) {
      await _offlineManager.executePendingActions();
    }
  }

  // Execute operation with full integration (error handling, loading, offline support)
  Future<T?> executeOperation<T>({
    required Future<T> Function() operation,
    required BuildContext context,
    String? loadingMessage,
    String? successMessage,
    bool showLoading = true,
    bool showSuccess = false,
    bool supportOffline = false,
    String? offlineCacheKey,
    T Function(Map<String, dynamic>)? fromCache,
    Duration cacheMaxAge = const Duration(hours: 1),
    VoidCallback? onSuccess,
    Function(dynamic error)? onError,
  }) async {
    try {
      // Show loading if requested
      if (showLoading) {
        LoadingManager().show(context, message: loadingMessage);
      }

      T? result;

      if (supportOffline && !_isOnline && offlineCacheKey != null && fromCache != null) {
        // Try to get from cache when offline
        final cachedData = await _offlineManager.getCachedData(
          offlineCacheKey,
          maxAge: cacheMaxAge,
        );
        if (cachedData != null) {
          result = fromCache(cachedData);
        } else {
          throw const OfflineException('No cached data available offline');
        }
      } else {
        // Execute network operation with retry
        result = await RetryHandler.retry(
          operation,
          retryIf: RetryHandler.shouldRetry,
        );

        // Cache result if offline support is enabled
        if (supportOffline && offlineCacheKey != null && result != null) {
          await _offlineManager.cacheData(offlineCacheKey, _toJson(result));
        }
      }

      // Show success message if requested
      if (showSuccess && successMessage != null) {
        _showSuccessSnackBar(context, successMessage);
      }

      onSuccess?.call();
      return result;
    } catch (error) {
      final failure = ErrorHandler.handleError(error);
      
      if (onError != null) {
        onError(error);
      } else {
        ErrorHandler.showErrorSnackBar(context, failure);
      }
      
      return null;
    } finally {
      if (showLoading) {
        LoadingManager().hide();
      }
    }
  }

  // Queue action for offline execution
  Future<void> queueOfflineAction({
    required OfflineActionType type,
    required Map<String, dynamic> data,
    String? id,
  }) async {
    final action = OfflineAction(
      id: id ?? DateTime.now().millisecondsSinceEpoch.toString(),
      type: type,
      data: data,
      timestamp: DateTime.now(),
    );
    
    await _offlineManager.queueAction(action);
  }

  // Get cached data with fallback
  Future<T?> getCachedData<T>({
    required String key,
    required T Function(Map<String, dynamic>) fromJson,
    Duration maxAge = const Duration(hours: 1),
  }) async {
    final cachedData = await _offlineManager.getCachedData(key, maxAge: maxAge);
    if (cachedData != null) {
      return fromJson(cachedData);
    }
    return null;
  }

  // Clear all cached data
  Future<void> clearCache() async {
    await _offlineManager.clearCache();
  }

  // Get pending actions count
  Future<int> getPendingActionsCount() async {
    final actions = await _offlineManager.getPendingActions();
    return actions.length;
  }

  void _showSuccessSnackBar(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.green,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  Map<String, dynamic> _toJson<T>(T data) {
    // Simplified JSON conversion - in a real app, implement proper serialization
    if (data is Map<String, dynamic>) {
      return data;
    }
    return {'data': data.toString()};
  }
}

// Integration-aware widget mixin
mixin IntegrationAwareMixin<T extends StatefulWidget> on State<T> {
  late StreamSubscription<bool> _connectivitySubscription;
  bool _isOnline = true;

  bool get isOnline => _isOnline;
  bool get isOffline => !_isOnline;

  @override
  void initState() {
    super.initState();
    _initializeConnectivity();
  }

  @override
  void dispose() {
    _connectivitySubscription.cancel();
    super.dispose();
  }

  void _initializeConnectivity() {
    final integrationService = IntegrationService();
    _isOnline = integrationService.isOnline;
    
    _connectivitySubscription = integrationService.connectivityStream.listen(
      (isConnected) {
        if (mounted) {
          setState(() {
            _isOnline = isConnected;
          });
          onConnectivityChanged(isConnected);
        }
      },
    );
  }

  // Override this method to handle connectivity changes
  void onConnectivityChanged(bool isConnected) {}

  // Execute operation with integration support
  Future<T?> executeIntegratedOperation<T>({
    required Future<T> Function() operation,
    String? loadingMessage,
    String? successMessage,
    bool showLoading = true,
    bool showSuccess = false,
    bool supportOffline = false,
    String? offlineCacheKey,
    T Function(Map<String, dynamic>)? fromCache,
    Duration cacheMaxAge = const Duration(hours: 1),
    VoidCallback? onSuccess,
    Function(dynamic error)? onError,
  }) async {
    return await IntegrationService().executeOperation<T>(
      operation: operation,
      context: context,
      loadingMessage: loadingMessage,
      successMessage: successMessage,
      showLoading: showLoading,
      showSuccess: showSuccess,
      supportOffline: supportOffline,
      offlineCacheKey: offlineCacheKey,
      fromCache: fromCache,
      cacheMaxAge: cacheMaxAge,
      onSuccess: onSuccess,
      onError: onError,
    );
  }

  // Build offline banner
  Widget buildOfflineBanner() {
    if (isOnline) return const SizedBox.shrink();
    
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      color: Colors.orange[600],
      child: Row(
        children: [
          const Icon(
            Icons.wifi_off,
            color: Colors.white,
            size: 16,
          ),
          const SizedBox(width: 8),
          const Expanded(
            child: Text(
              'You are offline. Some features may be limited.',
              style: TextStyle(
                color: Colors.white,
                fontSize: 12,
              ),
            ),
          ),
          FutureBuilder<int>(
            future: IntegrationService().getPendingActionsCount(),
            builder: (context, snapshot) {
              final count = snapshot.data ?? 0;
              if (count == 0) return const SizedBox.shrink();
              
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '$count pending',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 10,
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}

// Integrated error widget
class IntegratedErrorWidget extends StatelessWidget {
  final String message;
  final VoidCallback? onRetry;
  final bool isOffline;

  const IntegratedErrorWidget({
    super.key,
    required this.message,
    this.onRetry,
    this.isOffline = false,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              isOffline ? Icons.wifi_off : Icons.error_outline,
              size: 64,
              color: isOffline ? Colors.orange[300] : Colors.red[300],
            ),
            const SizedBox(height: 16),
            Text(
              isOffline ? 'You\'re Offline' : 'Something went wrong',
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              message,
              style: TextStyle(
                color: Colors.grey[600],
              ),
              textAlign: TextAlign.center,
            ),
            if (onRetry != null) ...[
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh),
                label: const Text('Try Again'),
              ),
            ],
            if (isOffline) ...[
              const SizedBox(height: 16),
              Text(
                'Some content may be available from cache',
                style: TextStyle(
                  color: Colors.grey[500],
                  fontSize: 12,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// Integrated loading widget
class IntegratedLoadingWidget extends StatelessWidget {
  final String? message;
  final bool showOfflineIndicator;

  const IntegratedLoadingWidget({
    super.key,
    this.message,
    this.showOfflineIndicator = false,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (showOfflineIndicator) ...[
            Icon(
              Icons.wifi_off,
              size: 32,
              color: Colors.orange[400],
            ),
            const SizedBox(height: 8),
            Text(
              'Loading from cache...',
              style: TextStyle(
                color: Colors.orange[600],
                fontSize: 12,
              ),
            ),
            const SizedBox(height: 16),
          ],
          const CircularProgressIndicator(),
          if (message != null) ...[
            const SizedBox(height: 16),
            Text(
              message!,
              style: TextStyle(
                color: Colors.grey[600],
                fontSize: 14,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ],
      ),
    );
  }
}