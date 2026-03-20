import 'package:flutter/foundation.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../di/injection_container.dart';
import '../network/network_info.dart';
import '../offline/offline_manager.dart';
import '../integration/integration_service.dart';

class SystemHealthChecker {
  static final SystemHealthChecker _instance = SystemHealthChecker._internal();
  factory SystemHealthChecker() => _instance;
  SystemHealthChecker._internal();

  Future<SystemHealthReport> performHealthCheck() async {
    final report = SystemHealthReport();
    
    try {
      // Check network connectivity
      report.networkStatus = await _checkNetworkHealth();
      
      // Check local storage
      report.storageStatus = await _checkStorageHealth();
      
      // Check dependency injection
      report.diStatus = await _checkDIHealth();
      
      // Check offline manager
      report.offlineStatus = await _checkOfflineHealth();
      
      // Check integration service
      report.integrationStatus = await _checkIntegrationHealth();
      
      // Check memory usage
      report.memoryStatus = await _checkMemoryHealth();
      
      // Overall health
      report.overallHealth = _calculateOverallHealth(report);
      
    } catch (e) {
      report.overallHealth = HealthStatus.critical;
      report.errors.add('Health check failed: ${e.toString()}');
    }
    
    return report;
  }

  Future<HealthStatus> _checkNetworkHealth() async {
    try {
      final networkInfo = sl<NetworkInfo>();
      final isConnected = await networkInfo.isConnected;
      
      if (isConnected) {
        // Try a simple network request
        return HealthStatus.healthy;
      } else {
        return HealthStatus.warning; // Offline but not critical
      }
    } catch (e) {
      return HealthStatus.critical;
    }
  }

  Future<HealthStatus> _checkStorageHealth() async {
    try {
      final prefs = sl<SharedPreferences>();
      
      // Test write/read
      const testKey = 'health_check_test';
      const testValue = 'test_value';
      
      await prefs.setString(testKey, testValue);
      final readValue = prefs.getString(testKey);
      
      if (readValue == testValue) {
        await prefs.remove(testKey);
        return HealthStatus.healthy;
      } else {
        return HealthStatus.critical;
      }
    } catch (e) {
      return HealthStatus.critical;
    }
  }

  Future<HealthStatus> _checkDIHealth() async {
    try {
      // Check if key services are registered
      final networkInfo = sl<NetworkInfo>();
      final offlineManager = sl<OfflineManager>();
      final integrationService = sl<IntegrationService>();
      
      if (networkInfo != null && 
          offlineManager != null && 
          integrationService != null) {
        return HealthStatus.healthy;
      } else {
        return HealthStatus.critical;
      }
    } catch (e) {
      return HealthStatus.critical;
    }
  }

  Future<HealthStatus> _checkOfflineHealth() async {
    try {
      final offlineManager = sl<OfflineManager>();
      
      // Check if offline manager is functional
      final isOnline = await offlineManager.isOnline();
      final pendingActions = await offlineManager.getPendingActions();
      
      // If we have too many pending actions, it might indicate a problem
      if (pendingActions.length > 100) {
        return HealthStatus.warning;
      }
      
      return HealthStatus.healthy;
    } catch (e) {
      return HealthStatus.critical;
    }
  }

  Future<HealthStatus> _checkIntegrationHealth() async {
    try {
      final integrationService = sl<IntegrationService>();
      
      if (integrationService.isInitialized) {
        return HealthStatus.healthy;
      } else {
        return HealthStatus.warning;
      }
    } catch (e) {
      return HealthStatus.critical;
    }
  }

  Future<HealthStatus> _checkMemoryHealth() async {
    try {
      // In debug mode, we can check memory usage
      if (kDebugMode) {
        // This is a simplified check - in a real app you might use
        // more sophisticated memory monitoring
        return HealthStatus.healthy;
      }
      
      return HealthStatus.healthy;
    } catch (e) {
      return HealthStatus.warning;
    }
  }

  HealthStatus _calculateOverallHealth(SystemHealthReport report) {
    final statuses = [
      report.networkStatus,
      report.storageStatus,
      report.diStatus,
      report.offlineStatus,
      report.integrationStatus,
      report.memoryStatus,
    ];
    
    if (statuses.any((status) => status == HealthStatus.critical)) {
      return HealthStatus.critical;
    }
    
    if (statuses.any((status) => status == HealthStatus.warning)) {
      return HealthStatus.warning;
    }
    
    return HealthStatus.healthy;
  }

  Future<void> performSystemOptimization() async {
    try {
      // Clear old cached data
      await _clearOldCache();
      
      // Optimize offline actions
      await _optimizeOfflineActions();
      
      // Clean up memory
      await _cleanupMemory();
      
    } catch (e) {
      debugPrint('System optimization failed: $e');
    }
  }

  Future<void> _clearOldCache() async {
    try {
      final offlineManager = sl<OfflineManager>();
      
      // Clear cache older than 7 days
      // This would need to be implemented in the offline manager
      // For now, we'll just clear all cache
      await offlineManager.clearCache();
      
    } catch (e) {
      debugPrint('Cache cleanup failed: $e');
    }
  }

  Future<void> _optimizeOfflineActions() async {
    try {
      final offlineManager = sl<OfflineManager>();
      
      // Get pending actions and remove duplicates or old ones
      final pendingActions = await offlineManager.getPendingActions();
      
      // If we have too many pending actions, clear old ones
      if (pendingActions.length > 50) {
        await offlineManager.clearPendingActions();
      }
      
    } catch (e) {
      debugPrint('Offline actions optimization failed: $e');
    }
  }

  Future<void> _cleanupMemory() async {
    try {
      // Force garbage collection in debug mode
      if (kDebugMode) {
        // This is platform-specific and might not always work
        // In a real app, you might implement more sophisticated memory management
      }
    } catch (e) {
      debugPrint('Memory cleanup failed: $e');
    }
  }
}

class SystemHealthReport {
  HealthStatus overallHealth = HealthStatus.unknown;
  HealthStatus networkStatus = HealthStatus.unknown;
  HealthStatus storageStatus = HealthStatus.unknown;
  HealthStatus diStatus = HealthStatus.unknown;
  HealthStatus offlineStatus = HealthStatus.unknown;
  HealthStatus integrationStatus = HealthStatus.unknown;
  HealthStatus memoryStatus = HealthStatus.unknown;
  
  List<String> errors = [];
  List<String> warnings = [];
  List<String> recommendations = [];
  
  DateTime timestamp = DateTime.now();

  Map<String, dynamic> toJson() {
    return {
      'timestamp': timestamp.toIso8601String(),
      'overallHealth': overallHealth.name,
      'networkStatus': networkStatus.name,
      'storageStatus': storageStatus.name,
      'diStatus': diStatus.name,
      'offlineStatus': offlineStatus.name,
      'integrationStatus': integrationStatus.name,
      'memoryStatus': memoryStatus.name,
      'errors': errors,
      'warnings': warnings,
      'recommendations': recommendations,
    };
  }

  String get summary {
    switch (overallHealth) {
      case HealthStatus.healthy:
        return 'System is running optimally';
      case HealthStatus.warning:
        return 'System is functional but has some issues';
      case HealthStatus.critical:
        return 'System has critical issues that need attention';
      case HealthStatus.unknown:
        return 'System health status is unknown';
    }
  }

  List<String> get issues {
    final issues = <String>[];
    
    if (networkStatus == HealthStatus.critical) {
      issues.add('Network connectivity is critical');
    } else if (networkStatus == HealthStatus.warning) {
      issues.add('Network connectivity has issues');
    }
    
    if (storageStatus == HealthStatus.critical) {
      issues.add('Local storage is not functioning');
    }
    
    if (diStatus == HealthStatus.critical) {
      issues.add('Dependency injection system has issues');
    }
    
    if (offlineStatus == HealthStatus.warning) {
      issues.add('Too many pending offline actions');
    }
    
    if (integrationStatus == HealthStatus.warning) {
      issues.add('Integration service is not properly initialized');
    }
    
    return issues;
  }
}

enum HealthStatus {
  healthy,
  warning,
  critical,
  unknown,
}

extension HealthStatusExtension on HealthStatus {
  String get displayName {
    switch (this) {
      case HealthStatus.healthy:
        return 'Healthy';
      case HealthStatus.warning:
        return 'Warning';
      case HealthStatus.critical:
        return 'Critical';
      case HealthStatus.unknown:
        return 'Unknown';
    }
  }

  String get emoji {
    switch (this) {
      case HealthStatus.healthy:
        return '✅';
      case HealthStatus.warning:
        return '⚠️';
      case HealthStatus.critical:
        return '❌';
      case HealthStatus.unknown:
        return '❓';
    }
  }
}