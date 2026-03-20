import 'package:flutter/material.dart';

import '../../../../core/system/system_manager.dart';
import '../../../../core/system/system_health_checker.dart';

class SystemStatusPage extends StatefulWidget {
  const SystemStatusPage({super.key});

  @override
  State<SystemStatusPage> createState() => _SystemStatusPageState();
}

class _SystemStatusPageState extends State<SystemStatusPage> {
  final SystemManager _systemManager = SystemManager();
  SystemOverallReport? _systemReport;
  List<String>? _diagnosticResults;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadSystemStatus();
  }

  Future<void> _loadSystemStatus() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final report = await _systemManager.getSystemStatus();
      setState(() {
        _systemReport = report;
      });
    } catch (e) {
      _showErrorSnackBar('Failed to load system status: $e');
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _runDiagnostics() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final results = await _systemManager.runSystemDiagnostics();
      final diagnosticResults = await SystemValidator().runSystemTests();
      
      setState(() {
        _diagnosticResults = diagnosticResults;
      });

      _showSuccessSnackBar('Diagnostics completed');
    } catch (e) {
      _showErrorSnackBar('Failed to run diagnostics: $e');
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _performMaintenance() async {
    setState(() {
      _isLoading = true;
    });

    try {
      await _systemManager.performSystemMaintenance();
      await _loadSystemStatus(); // Refresh status after maintenance
      _showSuccessSnackBar('System maintenance completed');
    } catch (e) {
      _showErrorSnackBar('Failed to perform maintenance: $e');
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
      ),
    );
  }

  void _showSuccessSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.green,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('System Status'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _isLoading ? null : _loadSystemStatus,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildOverallStatusCard(),
                  const SizedBox(height: 16),
                  _buildHealthStatusCard(),
                  const SizedBox(height: 16),
                  _buildPerformanceStatusCard(),
                  const SizedBox(height: 16),
                  _buildValidationStatusCard(),
                  const SizedBox(height: 16),
                  _buildActionsCard(),
                  if (_diagnosticResults != null) ...[
                    const SizedBox(height: 16),
                    _buildDiagnosticResultsCard(),
                  ],
                ],
              ),
            ),
    );
  }

  Widget _buildOverallStatusCard() {
    if (_systemReport == null) {
      return const Card(
        child: Padding(
          padding: EdgeInsets.all(16),
          child: Text('No system data available'),
        ),
      );
    }

    final status = _systemReport!.overallStatus;
    final color = _getStatusColor(status);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  status.emoji,
                  style: const TextStyle(fontSize: 24),
                ),
                const SizedBox(width: 8),
                Text(
                  'Overall System Status',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ],
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: color),
              ),
              child: Text(
                status.displayName,
                style: TextStyle(
                  color: color,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const SizedBox(height: 8),
            Text(_systemReport!.summary),
          ],
        ),
      ),
    );
  }

  Widget _buildHealthStatusCard() {
    final healthReport = _systemReport?.healthReport;
    if (healthReport == null) return const SizedBox.shrink();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'System Health',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 12),
            _buildHealthStatusItem('Network', healthReport.networkStatus),
            _buildHealthStatusItem('Storage', healthReport.storageStatus),
            _buildHealthStatusItem('Dependency Injection', healthReport.diStatus),
            _buildHealthStatusItem('Offline Manager', healthReport.offlineStatus),
            _buildHealthStatusItem('Integration Service', healthReport.integrationStatus),
            _buildHealthStatusItem('Memory', healthReport.memoryStatus),
            if (healthReport.issues.isNotEmpty) ...[
              const SizedBox(height: 12),
              const Text('Issues:', style: TextStyle(fontWeight: FontWeight.bold)),
              ...healthReport.issues.map((issue) => Padding(
                padding: const EdgeInsets.only(left: 16, top: 4),
                child: Text('• $issue'),
              )),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildHealthStatusItem(String label, HealthStatus status) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Text(status.emoji),
          const SizedBox(width: 8),
          Expanded(child: Text(label)),
          Text(
            status.displayName,
            style: TextStyle(
              color: _getHealthStatusColor(status),
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPerformanceStatusCard() {
    final performanceReport = _systemReport?.performanceReport;
    if (performanceReport == null) return const SizedBox.shrink();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Performance Status',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Text(performanceReport.isOptimal ? '✅' : '⚠️'),
                const SizedBox(width: 8),
                Text(
                  performanceReport.isOptimal ? 'Optimal' : 'Needs Attention',
                  style: TextStyle(
                    color: performanceReport.isOptimal ? Colors.green : Colors.orange,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
            if (performanceReport.networkMetrics.latencyMs > 0) ...[
              const SizedBox(height: 8),
              Text('Network Latency: ${performanceReport.networkMetrics.latencyMs}ms'),
            ],
            if (performanceReport.storageMetrics.readWriteTimeMs > 0) ...[
              const SizedBox(height: 4),
              Text('Storage Speed: ${performanceReport.storageMetrics.readWriteTimeMs}ms'),
            ],
            if (performanceReport.offlineMetrics.pendingActionsCount > 0) ...[
              const SizedBox(height: 4),
              Text('Pending Actions: ${performanceReport.offlineMetrics.pendingActionsCount}'),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildValidationStatusCard() {
    final validationReport = _systemReport?.validationReport;
    if (validationReport == null) return const SizedBox.shrink();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'System Validation',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Text(validationReport.overallValid ? '✅' : '❌'),
                const SizedBox(width: 8),
                Text(
                  validationReport.overallValid ? 'All Valid' : 'Issues Found',
                  style: TextStyle(
                    color: validationReport.overallValid ? Colors.green : Colors.red,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(validationReport.summary),
          ],
        ),
      ),
    );
  }

  Widget _buildActionsCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'System Actions',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _isLoading ? null : _runDiagnostics,
                    icon: const Icon(Icons.bug_report),
                    label: const Text('Run Diagnostics'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _isLoading ? null : _performMaintenance,
                    icon: const Icon(Icons.build),
                    label: const Text('Maintenance'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDiagnosticResultsCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Diagnostic Results',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 12),
            ..._diagnosticResults!.map((result) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 2),
              child: Text(
                result,
                style: TextStyle(
                  fontFamily: 'monospace',
                  color: result.startsWith('✅') ? Colors.green : Colors.red,
                ),
              ),
            )),
          ],
        ),
      ),
    );
  }

  Color _getStatusColor(SystemStatus status) {
    switch (status) {
      case SystemStatus.healthy:
        return Colors.green;
      case SystemStatus.warning:
        return Colors.orange;
      case SystemStatus.critical:
        return Colors.red;
      case SystemStatus.unknown:
        return Colors.grey;
    }
  }

  Color _getHealthStatusColor(HealthStatus status) {
    switch (status) {
      case HealthStatus.healthy:
        return Colors.green;
      case HealthStatus.warning:
        return Colors.orange;
      case HealthStatus.critical:
        return Colors.red;
      case HealthStatus.unknown:
        return Colors.grey;
    }
  }
}