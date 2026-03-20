import 'package:dartz/dartz.dart';

import '../../../../core/error/failures.dart';
import '../entities/address.dart';
import '../entities/checkout_data.dart';
import '../entities/order.dart' as checkout_order;
import '../entities/payment_method.dart';

abstract class CheckoutRepository {
  // Address management
  Future<Either<Failure, List<Address>>> getUserAddresses();
  Future<Either<Failure, Address>> saveAddress(Address address);
  Future<Either<Failure, void>> deleteAddress(String addressId);
  
  // Payment methods
  Future<Either<Failure, List<PaymentMethod>>> getPaymentMethods();
  Future<Either<Failure, PaymentMethod>> savePaymentMethod(PaymentMethod paymentMethod);
  Future<Either<Failure, void>> deletePaymentMethod(String paymentMethodId);
  
  // Checkout calculations
  Future<Either<Failure, CheckoutData>> calculateCheckout({
    required CheckoutData checkoutData,
    String? discountCode,
  });
  
  Future<Either<Failure, double>> validateDiscountCode(String discountCode);
  
  // Order placement
  Future<Either<Failure, checkout_order.Order>> placeOrder(CheckoutData checkoutData);
  
  // Order retrieval
  Future<Either<Failure, List<checkout_order.Order>>> getUserOrders();
  Future<Either<Failure, checkout_order.Order>> getOrderById(String orderId);
}