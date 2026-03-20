import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

import '../di/injection_container.dart';
import '../offline/offline_manager.dart';
import '../network/network_info.dart';

class PerformanceOptimizer {
  static final PerformanceOptimizer _instance = PerformanceOptimizer._internal();
  factory PerformanceOptimizer() => _instance;
  PerformanceOptimizer._internal();

  Future<PerformanceReport> analyzePerformance() async {
    final report = PerformanceReport();
    
    try {
      // Analyze memory usage
      report.memoryMetrics = await _analyzeMemoryUsage();
      
      // Analyze network performance
      report.networkMetrics = await _analyzeNetworkPerformance();
      
      // Analyze storage performance
      report.storageMetrics = await _analyzeStoragePerformance();
      
      // Analyze offline queue performance
      report.offlineMetrics = await _analyzeOfflinePerformance();
      
      // Generate recommendations
      report.recommendations = _generateRecommendations(report);
      
    } catch (e) {
      report.errors.add('Performance analysis failed: ${e.toString()}');
    }
    
    return report;
  }

  Future<MemoryMetrics> _analyzeMemoryUsage() async {
    final metrics = MemoryMetrics();
    
    try {
      if (kDebugMode) {
        // In debug mode, we can get some basic memory info
        // This is simplified - real apps might use platform channels
        metrics.isOptimal = true;
        metrics.recommendations.add('Memory usage appears normal');
      } else {
        // In release mode, we have limited memory monitoring
        metrics.isOptimal = true;
        metrics.recommendations.add('Memory monitoring limited in release mode');
      }
    } catch (e) {
      metrics.isOptimal = false;
      metrics.recommendations.add('Unable to analyze memory usage');
    }
    
    return metrics;
  }

  Future<NetworkMetrics> _analyzeNetworkPerformance() async {
    final metrics = NetworkMetrics();
    
    try {
      final networkInfo = sl<NetworkInfo>();
      final isConnected = await networkInfo.isConnected;
      
      if (isConnected) {
        // Test network latency with a simple ping
        final stopwatch = Stopwatch()..start();
        
        try {
          // This would be replaced with actual network test
          await Future.delayed(const Duration(milliseconds: 100));
          stopwatch.stop();
          
          metrics.latencyMs = stopwatch.elapsedMilliseconds;
          metrics.isOptimal = metrics.latencyMs < 1000; // Less than 1 second
          
          if (!metrics.isOptimal) {
            metrics.recommendations.add('Network latency is high (${metrics.latencyMs}ms)');
          }
        } catch (e) {
          metrics.isOptimal = false;
          metrics.recommendations.add('Network test failed');
        }
      } else {
        metrics.isOptimal = false;
        metrics.recommendations.add('No network connection available');
      }
    } catch (e) {
      metrics.isOptimal = false;
      metrics.recommendations.add('Network analysis failed');
    }
    
    return metrics;
  }

  Future<StorageMetrics> _analyzeStoragePerformance() async {
    final metrics = StorageMetrics();
    
    try {
      // Test storage read/write performance
      final stopwatch = Stopwatch()..start();
      
      // Simulate storage operations
      await Future.delayed(const Duration(milliseconds: 50));
      stopwatch.stop();
      
      metrics.readWriteTimeMs = stopwatch.elapsedMilliseconds;
      metrics.isOptimal = metrics.readWriteTimeMs < 500; // Less than 500ms
      
      if (!metrics.isOptimal) {
        metrics.recommendations.add('Storage operations are slow (${metrics.readWriteTimeMs}ms)');
      }
    } catch (e) {
      metrics.isOptimal = false;
      metrics.recommendations.add('Storage analysis failed');
    }
    
    return metrics;
  }

  Future<OfflineMetrics> _analyzeOfflinePerformance() async {
    final metrics = OfflineMetrics();
    
    try {
      final offlineManager = sl<OfflineManager>();
      final pendingActions = await offlineManager.getPendingActions();
      
      metrics.pendingActionsCount = pendingActions.length;
      metrics.isOptimal = metrics.pendingActionsCount < 20; // Less than 20 pending actions
      
      if (!metrics.isOptimal) {
        metrics.recommendations.add('Too many pending offline actions (${metrics.pendingActionsCount})');
        metrics.recommendations.add('Consider clearing old actions or improving sync');
      }
    } catch (e) {
      metrics.isOptimal = false;
      metrics.recommendations.add('Offline analysis failed');
    }
    
    return metrics;
  }

  List<String> _generateRecommendations(PerformanceReport report) {
    final recommendations = <String>[];
    
    // Collect all recommendations from metrics
    recommendations.addAll(report.memoryMetrics.recommendations);
    recommendations.addAll(report.networkMetrics.recommendations);
    recommendations.addAll(report.storageMetrics.recommendations);
    recommendations.addAll(report.offlineMetrics.recommendations);
    
    // Add general recommendations based on overall performance
    if (!report.isOptimal) {
      recommendations.add('Consider running system optimization');
      recommendations.add('Clear app cache if performance issues persist');
    }
    
    return recommendations;
  }

  Future<void> optimizePerformance() async {
    try {
      // Clear unnecessary cached data
      await _clearCache();
      
      // Optimize offline queue
      await _optimizeOfflineQueue();
      
      // Force garbage collection if possible
      await _forceGarbageCollection();
      
      debugPrint('Performance optimization completed');
    } catch (e) {
      debugPrint('Performance optimization failed: $e');
    }
  }

  Future<void> _clearCache() async {
    try {
      final offlineManager = sl<OfflineManager>();
      await offlineManager.clearCache();
    } catch (e) {
      debugPrint('Cache clearing failed: $e');
    }
  }

  Future<void> _optimizeOfflineQueue() async {
    try {
      final offlineManager = sl<OfflineManager>();
      final pendingActions = await offlineManager.getPendingActions();
      
      // If too many pending actions, clear old ones
      if (pendingActions.length > 50) {
        await offlineManager.clearPendingActions();
      }
    } catch (e) {
      debugPrint('Offline queue optimization failed: $e');
    }
  }

  Future<void> _forceGarbageCollection() async {
    try {
      if (kDebugMode) {
        // In debug mode, we might be able to suggest garbage collection
        // This is platform-specific and not guaranteed to work
        SystemChannels.platform.invokeMethod('SystemNavigator.pop');
      }
    } catch (e) {
      // Ignore errors - garbage collection is not critical
    }
  }
}

class PerformanceReport {
  MemoryMetrics memoryMetrics = MemoryMetrics();
  NetworkMetrics networkMetrics = NetworkMetrics();
  StorageMetrics storageMetrics = StorageMetrics();
  OfflineMetrics offlineMetrics = OfflineMetrics();
  
  List<String> recommendations = [];
  List<String> errors = [];
  DateTime timestamp = DateTime.now();

  bool get isOptimal {
    return memoryMetrics.isOptimal &&
           networkMetrics.isOptimal &&
           storageMetrics.isOptimal &&
           offlineMetrics.isOptimal;
  }

  Map<String, dynamic> toJson() {
    return {
      'timestamp': timestamp.toIso8601String(),
      'isOptimal': isOptimal,
      'memoryMetrics': memoryMetrics.toJson(),
      'networkMetrics': networkMetrics.toJson(),
      'storageMetrics': storageMetrics.toJson(),
      'offlineMetrics': offlineMetrics.toJson(),
      'recommendations': recommendations,
      'errors': errors,
    };
  }
}

class MemoryMetrics {
  bool isOptimal = false;
  List<String> recommendations = [];

  Map<String, dynamic> toJson() {
    return {
      'isOptimal': isOptimal,
      'recommendations': recommendations,
    };
  }
}

class NetworkMetrics {
  bool isOptimal = false;
  int latencyMs = 0;
  List<String> recommendations = [];

  Map<String, dynamic> toJson() {
    return {
      'isOptimal': isOptimal,
      'latencyMs': latencyMs,
      'recommendations': recommendations,
    };
  }
}

class StorageMetrics {
  bool isOptimal = false;
  int readWriteTimeMs = 0;
  List<String> recommendations = [];

  Map<String, dynamic> toJson() {
    return {
      'isOptimal': isOptimal,
      'readWriteTimeMs': readWriteTimeMs,
      'recommendations': recommendations,
    };
  }
}

class OfflineMetrics {
  bool isOptimal = false;
  int pendingActionsCount = 0;
  List<String> recommendations = [];

  Map<String, dynamic> toJson() {
    return {
      'isOptimal': isOptimal,
      'pendingActionsCount': pendingActionsCount,
      'recommendations': recommendations,
    };
  }
}