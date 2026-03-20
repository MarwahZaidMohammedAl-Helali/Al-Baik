import 'package:flutter/material.dart';
import 'package:dio/dio.dart';

import 'failures.dart';

class ErrorHandler {
  static Failure handleError(dynamic error) {
    if (error is DioException) {
      return _handleDioError(error);
    } else if (error is FormatException) {
      return const ServerFailure('Invalid data format received from server');
    } else if (error is TypeError) {
      return const ServerFailure('Data type mismatch error');
    } else {
      return ServerFailure('Unexpected error occurred: ${error.toString()}');
    }
  }

  static Failure _handleDioError(DioException error) {
    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return const NetworkFailure('Connection timeout. Please check your internet connection.');
      
      case DioExceptionType.badResponse:
        return _handleHttpError(error.response?.statusCode, error.response?.data);
      
      case DioExceptionType.cancel:
        return const NetworkFailure('Request was cancelled');
      
      case DioExceptionType.connectionError:
        return const NetworkFailure('No internet connection. Please check your network settings.');
      
      case DioExceptionType.badCertificate:
        return const NetworkFailure('SSL certificate error');
      
      case DioExceptionType.unknown:
      default:
        return NetworkFailure('Network error: ${error.message}');
    }
  }

  static Failure _handleHttpError(int? statusCode, dynamic responseData) {
    String message = 'Server error occurred';
    
    // Try to extract error message from response
    if (responseData is Map<String, dynamic>) {
      message = responseData['message'] ?? 
                responseData['error'] ?? 
                responseData['detail'] ?? 
                message;
    }

    switch (statusCode) {
      case 400:
        return ServerFailure('Bad request: $message');
      case 401:
        return const AuthFailure('Authentication failed. Please login again.');
      case 403:
        return const AuthFailure('Access denied. You don\'t have permission to perform this action.');
      case 404:
        return const ServerFailure('Requested resource not found');
      case 409:
        return ServerFailure('Conflict: $message');
      case 422:
        return ServerFailure('Validation error: $message');
      case 429:
        return const ServerFailure('Too many requests. Please try again later.');
      case 500:
        return const ServerFailure('Internal server error. Please try again later.');
      case 502:
        return const ServerFailure('Bad gateway. Server is temporarily unavailable.');
      case 503:
        return const ServerFailure('Service unavailable. Please try again later.');
      default:
        return ServerFailure('Server error ($statusCode): $message');
    }
  }

  static void showErrorSnackBar(BuildContext context, Failure failure) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(failure.message),
        backgroundColor: Colors.red,
        behavior: SnackBarBehavior.floating,
        action: SnackBarAction(
          label: 'Dismiss',
          textColor: Colors.white,
          onPressed: () {
            ScaffoldMessenger.of(context).hideCurrentSnackBar();
          },
        ),
      ),
    );
  }

  static void showErrorDialog(BuildContext context, Failure failure, {VoidCallback? onRetry}) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(
              Icons.error_outline,
              color: Colors.red[600],
            ),
            const SizedBox(width: 8),
            const Text('Error'),
          ],
        ),
        content: Text(failure.message),
        actions: [
          if (onRetry != null)
            TextButton(
              onPressed: () {
                Navigator.of(context).pop();
                onRetry();
              },
              child: const Text('Retry'),
            ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  static Widget buildErrorWidget(
    Failure failure, {
    VoidCallback? onRetry,
    String? customMessage,
  }) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              _getErrorIcon(failure),
              size: 64,
              color: Colors.red[300],
            ),
            const SizedBox(height: 16),
            Text(
              customMessage ?? 'Something went wrong',
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              failure.message,
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
          ],
        ),
      ),
    );
  }

  static IconData _getErrorIcon(Failure failure) {
    if (failure is NetworkFailure) {
      return Icons.wifi_off;
    } else if (failure is AuthFailure) {
      return Icons.lock_outline;
    } else {
      return Icons.error_outline;
    }
  }
}

// Custom exception for offline scenarios
class OfflineException implements Exception {
  final String message;
  const OfflineException(this.message);
}

// Retry mechanism
class RetryConfig {
  final int maxRetries;
  final Duration delay;
  final Duration maxDelay;
  final double backoffMultiplier;

  const RetryConfig({
    this.maxRetries = 3,
    this.delay = const Duration(seconds: 1),
    this.maxDelay = const Duration(seconds: 10),
    this.backoffMultiplier = 2.0,
  });
}

class RetryHandler {
  static Future<T> retry<T>(
    Future<T> Function() operation, {
    RetryConfig config = const RetryConfig(),
    bool Function(dynamic error)? retryIf,
  }) async {
    int attempts = 0;
    Duration currentDelay = config.delay;

    while (attempts < config.maxRetries) {
      try {
        return await operation();
      } catch (error) {
        attempts++;
        
        // Check if we should retry this error
        if (retryIf != null && !retryIf(error)) {
          rethrow;
        }
        
        // If this was the last attempt, rethrow the error
        if (attempts >= config.maxRetries) {
          rethrow;
        }
        
        // Wait before retrying
        await Future.delayed(currentDelay);
        
        // Increase delay for next attempt (exponential backoff)
        currentDelay = Duration(
          milliseconds: (currentDelay.inMilliseconds * config.backoffMultiplier).round(),
        );
        
        // Cap the delay at maxDelay
        if (currentDelay > config.maxDelay) {
          currentDelay = config.maxDelay;
        }
      }
    }
    
    throw StateError('Retry logic error - should not reach here');
  }

  static bool shouldRetry(dynamic error) {
    if (error is DioException) {
      switch (error.type) {
        case DioExceptionType.connectionTimeout:
        case DioExceptionType.sendTimeout:
        case DioExceptionType.receiveTimeout:
        case DioExceptionType.connectionError:
          return true;
        case DioExceptionType.badResponse:
          // Retry on server errors (5xx) but not client errors (4xx)
          final statusCode = error.response?.statusCode;
          return statusCode != null && statusCode >= 500;
        default:
          return false;
      }
    }
    return false;
  }
}