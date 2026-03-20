import '../../../../core/network/api_client.dart';
import '../models/order_tracking_model.dart';
import '../../../checkout/data/models/order_model.dart';

abstract class OrderTrackingRemoteDataSource {
  Future<List<OrderModel>> getUserOrders(String userId);
  Future<OrderTrackingModel> getOrderTracking(String orderId);
  Future<List<TrackingEventModel>> getOrderHistory(String orderId);
}

class OrderTrackingRemoteDataSourceImpl implements OrderTrackingRemoteDataSource {
  final ApiClient apiClient;

  OrderTrackingRemoteDataSourceImpl({required this.apiClient});

  @override
  Future<List<OrderModel>> getUserOrders(String userId) async {
    final response = await apiClient.get('/orders/user/$userId');
    return (response.data as List)
        .map((json) => OrderModel.fromJson(json))
        .toList();
  }

  @override
  Future<OrderTrackingModel> getOrderTracking(String orderId) async {
    final response = await apiClient.get('/orders/$orderId/tracking');
    return OrderTrackingModel.fromJson(response.data);
  }

  @override
  Future<List<TrackingEventModel>> getOrderHistory(String orderId) async {
    final response = await apiClient.get('/orders/$orderId/history');
    return (response.data as List)
        .map((json) => TrackingEventModel.fromJson(json))
        .toList();
  }
}