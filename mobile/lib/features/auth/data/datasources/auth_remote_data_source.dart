import '../../../../core/constants/api_constants.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/error/exceptions.dart';
import '../../../../core/storage/local_storage.dart';
import '../models/user_model.dart';

abstract class AuthRemoteDataSource {
  Future<UserModel> login({
    required String email,
    required String password,
  });
  
  Future<UserModel> register({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    required String role,
    String? phone,
    String? company,
  });
  
  Future<void> logout();
  
  Future<UserModel> getCurrentUser();
  
  Future<String> refreshToken();
}

class AuthRemoteDataSourceImpl implements AuthRemoteDataSource {
  final ApiClient apiClient;

  AuthRemoteDataSourceImpl({required this.apiClient});

  @override
  Future<UserModel> login({
    required String email,
    required String password,
  }) async {
    try {
      final response = await apiClient.post(
        ApiConstants.login,
        data: {
          'email': email,
          'password': password,
        },
      );

      if (response.data['success'] == true) {
        final userData = response.data['data']['user'];
        final token = response.data['data']['token'];
        
        // Save token to local storage
        await LocalStorage.saveToken(token);
        
        return UserModel.fromJson(userData);
      } else {
        throw ServerException(
          response.data['error']['message'] ?? 'Login failed',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      if (e is ServerException) rethrow;
      throw ServerException('Login failed: ${e.toString()}');
    }
  }

  @override
  Future<UserModel> register({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    required String role,
    String? phone,
    String? company,
  }) async {
    try {
      final response = await apiClient.post(
        ApiConstants.register,
        data: {
          'email': email,
          'password': password,
          'firstName': firstName,
          'lastName': lastName,
          'role': role,
          if (phone != null) 'phone': phone,
          if (company != null) 'company': company,
        },
      );

      if (response.data['success'] == true) {
        final userData = response.data['data']['user'];
        final token = response.data['data']['token'];
        
        // Save token to local storage
        await LocalStorage.saveToken(token);
        
        return UserModel.fromJson(userData);
      } else {
        throw ServerException(
          response.data['error']['message'] ?? 'Registration failed',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      if (e is ServerException) rethrow;
      throw ServerException('Registration failed: ${e.toString()}');
    }
  }

  @override
  Future<void> logout() async {
    try {
      await apiClient.post(ApiConstants.logout);
    } catch (e) {
      // Even if logout fails on server, we should clear local data
      throw ServerException('Logout failed: ${e.toString()}');
    }
  }

  @override
  Future<UserModel> getCurrentUser() async {
    try {
      final response = await apiClient.get(ApiConstants.userProfile);

      if (response.data['success'] == true) {
        final userData = response.data['data'];
        return UserModel.fromJson(userData);
      } else {
        throw ServerException(
          response.data['error']['message'] ?? 'Failed to get user data',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      if (e is ServerException) rethrow;
      throw ServerException('Failed to get user data: ${e.toString()}');
    }
  }

  @override
  Future<String> refreshToken() async {
    try {
      final response = await apiClient.post(ApiConstants.refreshToken);

      if (response.data['success'] == true) {
        return response.data['data']['token'];
      } else {
        throw ServerException(
          response.data['error']['message'] ?? 'Token refresh failed',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      if (e is ServerException) rethrow;
      throw ServerException('Token refresh failed: ${e.toString()}');
    }
  }
}