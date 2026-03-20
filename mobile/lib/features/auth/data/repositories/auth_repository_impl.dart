import 'package:dartz/dartz.dart';

import '../../../../core/error/exceptions.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/network/network_info.dart';
import '../../../../core/storage/local_storage.dart';
import '../../domain/entities/user.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/auth_remote_data_source.dart';
import '../models/user_model.dart';

class AuthRepositoryImpl implements AuthRepository {
  final AuthRemoteDataSource remoteDataSource;
  final LocalStorage localStorage;
  final NetworkInfo networkInfo;

  AuthRepositoryImpl({
    required this.remoteDataSource,
    required this.localStorage,
    required this.networkInfo,
  });

  @override
  Future<Either<Failure, User>> login({
    required String email,
    required String password,
  }) async {
    if (await networkInfo.isConnected) {
      try {
        final userModel = await remoteDataSource.login(
          email: email,
          password: password,
        );
        
        // Save user data and token to local storage
        await LocalStorage.saveUserData(userModel.toJson());
        
        return Right(userModel.toEntity());
      } on ServerException catch (e) {
        return Left(ServerFailure(e.message, statusCode: e.statusCode));
      } on AuthenticationException catch (e) {
        return Left(AuthenticationFailure(e.message));
      } catch (e) {
        return Left(ServerFailure('Login failed: ${e.toString()}'));
      }
    } else {
      return const Left(NetworkFailure('No internet connection'));
    }
  }

  @override
  Future<Either<Failure, User>> register({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    required String role,
    String? phone,
    String? company,
  }) async {
    if (await networkInfo.isConnected) {
      try {
        final userModel = await remoteDataSource.register(
          email: email,
          password: password,
          firstName: firstName,
          lastName: lastName,
          role: role,
          phone: phone,
          company: company,
        );
        
        // Save user data and token to local storage
        await LocalStorage.saveUserData(userModel.toJson());
        
        return Right(userModel.toEntity());
      } on ServerException catch (e) {
        return Left(ServerFailure(e.message, statusCode: e.statusCode));
      } on ValidationException catch (e) {
        return Left(ValidationFailure(e.message, fieldErrors: e.fieldErrors));
      } catch (e) {
        return Left(ServerFailure('Registration failed: ${e.toString()}'));
      }
    } else {
      return const Left(NetworkFailure('No internet connection'));
    }
  }

  @override
  Future<Either<Failure, void>> logout() async {
    try {
      // Try to logout from server
      if (await networkInfo.isConnected) {
        await remoteDataSource.logout();
      }
      
      // Clear local storage regardless of server response
      await LocalStorage.clearToken();
      await LocalStorage.clearUserData();
      await LocalStorage.clearCart();
      
      return const Right(null);
    } catch (e) {
      // Even if server logout fails, clear local data
      await LocalStorage.clearToken();
      await LocalStorage.clearUserData();
      await LocalStorage.clearCart();
      
      return const Right(null);
    }
  }

  @override
  Future<Either<Failure, User>> getCurrentUser() async {
    try {
      // First try to get user from local storage
      final userData = LocalStorage.getUserData();
      if (userData != null) {
        final userModel = UserModel.fromJson(userData);
        return Right(userModel.toEntity());
      }
      
      // If not in local storage and connected, fetch from server
      if (await networkInfo.isConnected) {
        final userModel = await remoteDataSource.getCurrentUser();
        await LocalStorage.saveUserData(userModel.toJson());
        return Right(userModel.toEntity());
      } else {
        return const Left(NetworkFailure('No internet connection'));
      }
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message, statusCode: e.statusCode));
    } on AuthenticationException catch (e) {
      return Left(AuthenticationFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Failed to get user data: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, String>> refreshToken() async {
    if (await networkInfo.isConnected) {
      try {
        final newToken = await remoteDataSource.refreshToken();
        await LocalStorage.saveToken(newToken);
        return Right(newToken);
      } on ServerException catch (e) {
        return Left(ServerFailure(e.message, statusCode: e.statusCode));
      } on AuthenticationException catch (e) {
        return Left(AuthenticationFailure(e.message));
      } catch (e) {
        return Left(ServerFailure('Token refresh failed: ${e.toString()}'));
      }
    } else {
      return const Left(NetworkFailure('No internet connection'));
    }
  }

  @override
  Future<bool> isLoggedIn() async {
    return LocalStorage.isLoggedIn;
  }
}