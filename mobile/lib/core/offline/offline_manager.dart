import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

import '../network/network_info.dart';

class OfflineManager {
  static const String _offlineDataKey = 'offline_data';
  static const String _pendingActionsKey = 'pending_actions';
  
  final SharedPreferences _prefs;
  final NetworkInfo _networkInfo;
  final Connectivity _connectivity;

  OfflineManager({
    required SharedPreferences prefs,
    required NetworkInfo networkInfo,
    required Connectivity connectivity,
  }) : _prefs = prefs,
       _networkInfo = networkInfo,
       _connectivity = connectivity;

  // Cache data for offline access
  Future<void> cacheData(String key, Map<String, dynamic> data) async {
    final offlineData = await _getOfflineData();
    offlineData[key] = {
      'data': data,
      'timestamp': DateTime.now().millisecondsSinceEpoch,
    };
    await _saveOfflineData(offlineData);
  }

  // Get cached data
  Future<Map<String, dynamic>?> getCachedData(String key, {Duration? maxAge}) async {
    final offlineData = await _getOfflineData();
    final cachedItem = offlineData[key];
    
    if (cachedItem == null) return null;
    
    // Check if data is too old
    if (maxAge != null) {
      final timestamp = cachedItem['timestamp'] as int;
      final cacheTime = DateTime.fromMillisecondsSinceEpoch(timestamp);
      if (DateTime.now().difference(cacheTime) > maxAge) {
        return null;
      }
    }
    
    return cachedItem['data'] as Map<String, dynamic>?;
  }

  // Queue action for when online
  Future<void> queueAction(OfflineAction action) async {
    final pendingActions = await _getPendingActions();
    pendingActions.add(action.toJson());
    await _savePendingActions(pendingActions);
  }

  // Get pending actions
  Future<List<OfflineAction>> getPendingActions() async {
    final actionsJson = await _getPendingActions();
    return actionsJson.map((json) => OfflineAction.fromJson(json)).toList();
  }

  // Execute pending actions when online
  Future<void> executePendingActions() async {
    if (!await _networkInfo.isConnected) return;
    
    final pendingActions = await getPendingActions();
    final successfulActions = <int>[];
    
    for (int i = 0; i < pendingActions.length; i++) {
      final action = pendingActions[i];
      try {
        await _executeAction(action);
        successfulActions.add(i);
      } catch (e) {
        // Log error but continue with other actions
        print('Failed to execute offline action: $e');
      }
    }
    
    // Remove successful actions
    if (successfulActions.isNotEmpty) {
      final remainingActions = <Map<String, dynamic>>[];
      final allActions = await _getPendingActions();
      
      for (int i = 0; i < allActions.length; i++) {
        if (!successfulActions.contains(i)) {
          remainingActions.add(allActions[i]);
        }
      }
      
      await _savePendingActions(remainingActions);
    }
  }

  // Clear all cached data
  Future<void> clearCache() async {
    await _prefs.remove(_offlineDataKey);
  }

  // Clear pending actions
  Future<void> clearPendingActions() async {
    await _prefs.remove(_pendingActionsKey);
  }

  // Check if device is online
  Future<bool> isOnline() async {
    return await _networkInfo.isConnected;
  }

  // Listen to connectivity changes
  Stream<ConnectivityResult> get connectivityStream => _connectivity.onConnectivityChanged;

  // Private methods
  Future<Map<String, dynamic>> _getOfflineData() async {
    final dataString = _prefs.getString(_offlineDataKey);
    if (dataString == null) return {};
    return json.decode(dataString) as Map<String, dynamic>;
  }

  Future<void> _saveOfflineData(Map<String, dynamic> data) async {
    await _prefs.setString(_offlineDataKey, json.encode(data));
  }

  Future<List<Map<String, dynamic>>> _getPendingActions() async {
    final actionsString = _prefs.getString(_pendingActionsKey);
    if (actionsString == null) return [];
    final actionsList = json.decode(actionsString) as List;
    return actionsList.cast<Map<String, dynamic>>();
  }

  Future<void> _savePendingActions(List<Map<String, dynamic>> actions) async {
    await _prefs.setString(_pendingActionsKey, json.encode(actions));
  }

  Future<void> _executeAction(OfflineAction action) async {
    // This would be implemented based on the specific action type
    // For now, we'll just simulate execution
    switch (action.type) {
      case OfflineActionType.addToCart:
        // Execute add to cart API call
        break;
      case OfflineActionType.updateProfile:
        // Execute profile update API call
        break;
      case OfflineActionType.placeOrder:
        // Execute place order API call
        break;
      // Add more action types as needed
    }
  }
}

// Offline action model
class OfflineAction {
  final String id;
  final OfflineActionType type;
  final Map<String, dynamic> data;
  final DateTime timestamp;

  OfflineAction({
    required this.id,
    required this.type,
    required this.data,
    required this.timestamp,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type.name,
      'data': data,
      'timestamp': timestamp.millisecondsSinceEpoch,
    };
  }

  factory OfflineAction.fromJson(Map<String, dynamic> json) {
    return OfflineAction(
      id: json['id'] as String,
      type: OfflineActionType.values.firstWhere(
        (e) => e.name == json['type'],
        orElse: () => OfflineActionType.unknown,
      ),
      data: json['data'] as Map<String, dynamic>,
      timestamp: DateTime.fromMillisecondsSinceEpoch(json['timestamp'] as int),
    );
  }
}

enum OfflineActionType {
  addToCart,
  removeFromCart,
  updateProfile,
  placeOrder,
  updateInventory,
  updateOrderStatus,
  unknown,
}

// Offline-aware widget mixin
mixin OfflineAwareMixin {
  bool _isOnline = true;
  
  bool get isOnline => _isOnline;
  bool get isOffline => !_isOnline;

  void updateConnectivityStatus(bool isConnected) {
    _isOnline = isConnected;
  }

  Widget buildOfflineBanner() {
    if (isOnline) return const SizedBox.shrink();
    
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      color: Colors.orange[600],
      child: const Row(
        children: [
          Icon(
            Icons.wifi_off,
            color: Colors.white,
            size: 16,
          ),
          SizedBox(width: 8),
          Text(
            'You are offline. Some features may be limited.',
            style: TextStyle(
              color: Colors.white,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }
}

// Cache strategies
enum CacheStrategy {
  cacheFirst,    // Use cache first, fallback to network
  networkFirst,  // Use network first, fallback to cache
  cacheOnly,     // Use cache only
  networkOnly,   // Use network only
}

class CacheManager {
  final OfflineManager _offlineManager;

  CacheManager(this._offlineManager);

  Future<T?> getData<T>(
    String key,
    Future<T> Function() networkCall,
    T Function(Map<String, dynamic>) fromJson, {
    CacheStrategy strategy = CacheStrategy.networkFirst,
    Duration maxAge = const Duration(hours: 1),
  }) async {
    switch (strategy) {
      case CacheStrategy.cacheFirst:
        return await _getCacheFirst(key, networkCall, fromJson, maxAge);
      case CacheStrategy.networkFirst:
        return await _getNetworkFirst(key, networkCall, fromJson, maxAge);
      case CacheStrategy.cacheOnly:
        return await _getCacheOnly(key, fromJson, maxAge);
      case CacheStrategy.networkOnly:
        return await _getNetworkOnly(networkCall);
    }
  }

  Future<T?> _getCacheFirst<T>(
    String key,
    Future<T> Function() networkCall,
    T Function(Map<String, dynamic>) fromJson,
    Duration maxAge,
  ) async {
    // Try cache first
    final cachedData = await _offlineManager.getCachedData(key, maxAge: maxAge);
    if (cachedData != null) {
      return fromJson(cachedData);
    }

    // Fallback to network
    try {
      final networkData = await networkCall();
      if (networkData != null) {
        // Cache the network data
        await _offlineManager.cacheData(key, _toJson(networkData));
      }
      return networkData;
    } catch (e) {
      return null;
    }
  }

  Future<T?> _getNetworkFirst<T>(
    String key,
    Future<T> Function() networkCall,
    T Function(Map<String, dynamic>) fromJson,
    Duration maxAge,
  ) async {
    try {
      // Try network first
      final networkData = await networkCall();
      if (networkData != null) {
        // Cache the network data
        await _offlineManager.cacheData(key, _toJson(networkData));
      }
      return networkData;
    } catch (e) {
      // Fallback to cache
      final cachedData = await _offlineManager.getCachedData(key, maxAge: maxAge);
      if (cachedData != null) {
        return fromJson(cachedData);
      }
      rethrow;
    }
  }

  Future<T?> _getCacheOnly<T>(
    String key,
    T Function(Map<String, dynamic>) fromJson,
    Duration maxAge,
  ) async {
    final cachedData = await _offlineManager.getCachedData(key, maxAge: maxAge);
    if (cachedData != null) {
      return fromJson(cachedData);
    }
    return null;
  }

  Future<T?> _getNetworkOnly<T>(Future<T> Function() networkCall) async {
    return await networkCall();
  }

  Map<String, dynamic> _toJson<T>(T data) {
    // This is a simplified implementation
    // In a real app, you'd implement proper serialization for each type
    if (data is Map<String, dynamic>) {
      return data;
    }
    // Add more type handling as needed
    return {'data': data.toString()};
  }
}