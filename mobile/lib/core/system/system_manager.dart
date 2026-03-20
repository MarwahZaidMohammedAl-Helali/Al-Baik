import 'package:flutter/foundation.dart';

import 'system_health_checker.dart';
import 'performance_optimizer.dart';
import 'system_validator.dart';

/// Central system management class that coordinates all system-level operations
class SystemManager {
  static final SystemManager _instance = SystemManager._internal();
  factory SystemManager() => _instance;
  SystemManager._internal();

  final SystemHealthChecker _healthChecker = SystemHealthChecker();
  final PerformanceOptimizer _performanceOptimizer = PerformanceOptimizer();
  final SystemValidator _systemValidator = SystemValidator();

  bool _isInitialized = false;
  DateTime? _lastHealthCheck;
  DateTime? _lastPerformanceAnalysis;
  DateTime? _lastSystemValidation;

  bool get isInitialized => _isInitialized;

  Future<void> initialize() async {
    if (_isInitialized) return;

    try {
      debugPrint('Initializing System Manager...');
      
      // Perform initial system validation
      final validationReport = await _systemValidator.validateSystem();
      
      if (!validationReport.overallValid) {
        debugPrint('System validation failed: ${validationReport.summary}');
        // Continue initialization but log the issues
        for (final error in validationReport.errors) {
          debugPrint('Validation error: $error');
        }
      }
      
      // Perform initial health check
      final healthReport = await _healthChecker.performHealthCheck();
      _lastHealthCheck = DateTime.now();
      
      debugPrint('System health: ${healthReport.summary}');
      
      // Perform initial performance analysis
      final performanceReport = await _performanceOptimizer.analyzePerformance();
      _lastPerformanceAnalysis = DateTime.now();
      
      if (!performanceReport.isOptimal) {
        debugPrint('Performance issues detected, running optimization...');
        await _performanceOptimizer.optimizePerformance();
      }
      
      _isInitialized = true;
      debugPrint('System Manager initialized successfully');
      
    } catch (e) {
      debugPrint('System Manager initialization failed: $e');
      // Don't throw - allow app to continue with limited functionality
    }
  }

  Future<SystemOverallReport> getSystemStatus() async {
    final report = SystemOverallReport();
    
    try {
      // Get health status
      final healthReport = await _healthChecker.performHealthCheck();
      report.healthReport = healthReport;
      _lastHealthCheck = DateTime.now();
      
      // Get performance status
      final performanceReport = await _performanceOptimizer.analyzePerformance();
      report.performanceReport = performanceReport;
      _lastPerformanceAnalysis = DateTime.now();
      
      // Get validation status
      final validationReport = await _systemValidator.validateSystem();
      report.validationReport = validationReport;
      _lastSystemValidation = DateTime.now();
      
      // Calculate overall system status
      report.overallStatus = _calculateOverallStatus(
        healthReport,
        performanceReport,
        validationReport,
      );
      
    } catch (e) {
      report.errors.add('Failed to get system status: ${e.toString()}');
      report.overallStatus = SystemStatus.critical;
    }
    
    return report;
  }

  Future<void> performSystemMaintenance() async {
    try {
      debugPrint('Starting system maintenance...');
      
      // Run system optimization
      await _healthChecker.performSystemOptimization();
      await _performanceOptimizer.optimizePerformance();
      
      // Run system tests
      final testResults = await _systemValidator.runSystemTests();
      
      debugPrint('System maintenance completed');
      debugPrint('Test results:');
      for (final result in testResults) {
        debugPrint('  $result');
      }
      
    } catch (e) {
      debugPrint('System maintenance failed: $e');
    }
  }

  Future<bool> runSystemDiagnostics() async {
    try {
      debugPrint('Running system diagnostics...');
      
      // Run comprehensive system tests
      final testResults = await _systemValidator.runSystemTests();
      
      // Check if all tests passed
      final allTestsPassed = testResults.every((result) => result.startsWith('✅'));
      
      debugPrint('System diagnostics completed');
      debugPrint('All tests passed: $allTestsPassed');
      
      for (final result in testResults) {
        debugPrint('  $result');
      }
      
      return allTestsPassed;
      
    } catch (e) {
      debugPrint('System diagnostics failed: $e');
      return false;
    }
  }

  SystemStatus _calculateOverallStatus(
    SystemHealthReport healthReport,
    PerformanceReport performanceReport,
    SystemValidationReport validationReport,
  ) {
    // If validation failed, system is critical
    if (!validationReport.overallValid) {
      return SystemStatus.critical;
    }
    
    // If health is critical, system is critical
    if (healthReport.overallHealth == HealthStatus.critical) {
      return SystemStatus.critical;
    }
    
    // If health has warnings or performance is not optimal, system has warnings
    if (healthReport.overallHealth == HealthStatus.warning || 
        !performanceReport.isOptimal) {
      return SystemStatus.warning;
    }
    
    // If everything is good, system is healthy
    if (healthReport.overallHealth == HealthStatus.healthy && 
        performanceReport.isOptimal) {
      return SystemStatus.healthy;
    }
    
    // Default to unknown if we can't determine status
    return SystemStatus.unknown;
  }

  bool shouldPerformHealthCheck() {
    if (_lastHealthCheck == null) return true;
    
    // Perform health check every 5 minutes
    final timeSinceLastCheck = DateTime.now().difference(_lastHealthCheck!);
    return timeSinceLastCheck.inMinutes >= 5;
  }

  bool shouldPerformPerformanceAnalysis() {
    if (_lastPerformanceAnalysis == null) return true;
    
    // Perform performance analysis every 10 minutes
    final timeSinceLastAnalysis = DateTime.now().difference(_lastPerformanceAnalysis!);
    return timeSinceLastAnalysis.inMinutes >= 10;
  }

  bool shouldPerformSystemValidation() {
    if (_lastSystemValidation == null) return true;
    
    // Perform system validation every 30 minutes
    final timeSinceLastValidation = DateTime.now().difference(_lastSystemValidation!);
    return timeSinceLastValidation.inMinutes >= 30;
  }

  Future<void> schedulePeriodicMaintenance() async {
    // This would typically be called by a background service or timer
    try {
      if (shouldPerformHealthCheck()) {
        await _healthChecker.performHealthCheck();
        _lastHealthCheck = DateTime.now();
      }
      
      if (shouldPerformPerformanceAnalysis()) {
        final report = await _performanceOptimizer.analyzePerformance();
        _lastPerformanceAnalysis = DateTime.now();
        
        if (!report.isOptimal) {
          await _performanceOptimizer.optimizePerformance();
        }
      }
      
      if (shouldPerformSystemValidation()) {
        await _systemValidator.validateSystem();
        _lastSystemValidation = DateTime.now();
      }
      
    } catch (e) {
      debugPrint('Periodic maintenance failed: $e');
    }
  }
}

class SystemOverallReport {
  SystemHealthReport? healthReport;
  PerformanceReport? performanceReport;
  SystemValidationReport? validationReport;
  
  SystemStatus overallStatus = SystemStatus.unknown;
  List<String> errors = [];
  DateTime timestamp = DateTime.now();

  Map<String, dynamic> toJson() {
    return {
      'timestamp': timestamp.toIso8601String(),
      'overallStatus': overallStatus.name,
      'healthReport': healthReport?.toJson(),
      'performanceReport': performanceReport?.toJson(),
      'validationReport': validationReport?.toJson(),
      'errors': errors,
    };
  }

  String get summary {
    switch (overallStatus) {
      case SystemStatus.healthy:
        return 'System is running optimally with no issues';
      case SystemStatus.warning:
        return 'System is functional but has some performance or health issues';
      case SystemStatus.critical:
        return 'System has critical issues that need immediate attention';
      case SystemStatus.unknown:
        return 'System status could not be determined';
    }
  }

  List<String> get allRecommendations {
    final recommendations = <String>[];
    
    if (healthReport != null) {
      recommendations.addAll(healthReport!.recommendations);
    }
    
    if (performanceReport != null) {
      recommendations.addAll(performanceReport!.recommendations);
    }
    
    return recommendations;
  }
}

enum SystemStatus {
  healthy,
  warning,
  critical,
  unknown,
}

extension SystemStatusExtension on SystemStatus {
  String get displayName {
    switch (this) {
      case SystemStatus.healthy:
        return 'Healthy';
      case SystemStatus.warning:
        return 'Warning';
      case SystemStatus.critical:
        return 'Critical';
      case SystemStatus.unknown:
        return 'Unknown';
    }
  }

  String get emoji {
    switch (this) {
      case SystemStatus.healthy:
        return '✅';
      case SystemStatus.warning:
        return '⚠️';
      case SystemStatus.critical:
        return '❌';
      case SystemStatus.unknown:
        return '❓';
    }
  }
}