import 'package:dartz/dartz.dart';

import '../../../../core/error/failures.dart';
import '../../domain/entities/address.dart';
import '../../domain/entities/checkout_data.dart';
import '../../domain/entities/order.dart' as checkout_order;
import '../../domain/entities/payment_method.dart';
import '../../domain/repositories/checkout_repository.dart';

class CheckoutRepositoryImpl implements CheckoutRepository {
  @override
  Future<Either<Failure, List<Address>>> getUserAddresses() async {
    // Mock implementation - return sample addresses
    await Future.delayed(const Duration(milliseconds: 500));
    
    final addresses = [
      const Address(
        id: 'addr_1',
        firstName: 'John',
        lastName: 'Doe',
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'USA',
        phone: '+1 (555) 123-4567',
        isDefault: true,
        type: AddressType.shipping,
      ),
      const Address(
        id: 'addr_2',
        firstName: 'John',
        lastName: 'Doe',
        street: '456 Oak Ave',
        city: 'Los Angeles',
        state: 'CA',
        zipCode: '90210',
        country: 'USA',
        phone: '+1 (555) 987-6543',
        type: AddressType.shipping,
      ),
    ];
    
    return Right(addresses);
  }

  @override
  Future<Either<Failure, Address>> saveAddress(Address address) async {
    // Mock implementation
    await Future.delayed(const Duration(milliseconds: 500));
    return Right(address);
  }

  @override
  Future<Either<Failure, void>> deleteAddress(String addressId) async {
    // Mock implementation
    await Future.delayed(const Duration(milliseconds: 500));
    return const Right(null);
  }

  @override
  Future<Either<Failure, List<PaymentMethod>>> getPaymentMethods() async {
    // Mock implementation - return sample payment methods
    await Future.delayed(const Duration(milliseconds: 500));
    
    final paymentMethods = [
      const PaymentMethod(
        id: 'pm_1',
        type: PaymentType.creditCard,
        displayName: 'Visa Credit Card',
        last4Digits: '4242',
        expiryMonth: '12',
        expiryYear: '25',
        cardholderName: 'John Doe',
        isDefault: true,
      ),
      const PaymentMethod(
        id: 'pm_2',
        type: PaymentType.paypal,
        displayName: 'PayPal',
      ),
    ];
    
    return Right(paymentMethods);
  }

  @override
  Future<Either<Failure, PaymentMethod>> savePaymentMethod(PaymentMethod paymentMethod) async {
    // Mock implementation
    await Future.delayed(const Duration(milliseconds: 500));
    return Right(paymentMethod);
  }

  @override
  Future<Either<Failure, void>> deletePaymentMethod(String paymentMethodId) async {
    // Mock implementation
    await Future.delayed(const Duration(milliseconds: 500));
    return const Right(null);
  }

  @override
  Future<Either<Failure, CheckoutData>> calculateCheckout({
    required CheckoutData checkoutData,
    String? discountCode,
  }) async {
    // Mock implementation - calculate totals
    await Future.delayed(const Duration(milliseconds: 800));
    
    final subtotal = checkoutData.cart.totalPrice;
    double discountAmount = 0.0;
    
    // Apply discount if code is provided
    if (discountCode != null) {
      switch (discountCode.toUpperCase()) {
        case 'WELCOME10':
          discountAmount = subtotal * 0.10; // 10% discount
          break;
        case 'WHOLESALE':
          discountAmount = subtotal * 0.15; // 15% wholesale discount
          break;
        case 'SAVE20':
          discountAmount = subtotal * 0.20; // 20% discount
          break;
        default:
          return const Left(ServerFailure('Invalid discount code'));
      }
    }
    
    final discountedSubtotal = subtotal - discountAmount;
    final taxAmount = discountedSubtotal * 0.08; // 8% tax
    final shippingCost = discountedSubtotal > 50 ? 0.0 : 5.99; // Free shipping over $50
    final totalAmount = discountedSubtotal + taxAmount + shippingCost;
    
    final updatedCheckoutData = checkoutData.copyWith(
      subtotal: subtotal,
      discountAmount: discountAmount,
      taxAmount: taxAmount,
      shippingCost: shippingCost,
      totalAmount: totalAmount,
      discountCode: discountCode,
    );
    
    return Right(updatedCheckoutData);
  }

  @override
  Future<Either<Failure, double>> validateDiscountCode(String discountCode) async {
    // Mock implementation
    await Future.delayed(const Duration(milliseconds: 500));
    
    switch (discountCode.toUpperCase()) {
      case 'WELCOME10':
        return const Right(0.10);
      case 'WHOLESALE':
        return const Right(0.15);
      case 'SAVE20':
        return const Right(0.20);
      default:
        return const Left(ServerFailure('Invalid discount code'));
    }
  }

  @override
  Future<Either<Failure, checkout_order.Order>> placeOrder(CheckoutData checkoutData) async {
    // Mock implementation - simulate order placement
    await Future.delayed(const Duration(milliseconds: 2000));
    
    if (!checkoutData.isComplete) {
      return const Left(ServerFailure('Incomplete checkout data'));
    }
    
    final order = checkout_order.Order(
      id: 'order_${DateTime.now().millisecondsSinceEpoch}',
      orderNumber: 'WE-${DateTime.now().millisecondsSinceEpoch.toString().substring(8)}',
      userId: 'user_123', // TODO: Get from auth
      items: checkoutData.cart.items,
      shippingAddress: checkoutData.shippingAddress!,
      billingAddress: checkoutData.billingAddress!,
      paymentMethod: checkoutData.paymentMethod!,
      status: checkout_order.OrderStatus.confirmed,
      subtotal: checkoutData.subtotal,
      discountAmount: checkoutData.discountAmount,
      taxAmount: checkoutData.taxAmount,
      shippingCost: checkoutData.shippingCost,
      totalAmount: checkoutData.totalAmount,
      discountCode: checkoutData.discountCode,
      trackingNumber: 'TRK${DateTime.now().millisecondsSinceEpoch.toString().substring(6)}',
      estimatedDelivery: DateTime.now().add(const Duration(days: 5)),
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );
    
    return Right(order);
  }

  @override
  Future<Either<Failure, List<checkout_order.Order>>> getUserOrders() async {
    // Mock implementation
    await Future.delayed(const Duration(milliseconds: 500));
    return const Right([]);
  }

  @override
  Future<Either<Failure, checkout_order.Order>> getOrderById(String orderId) async {
    // Mock implementation
    await Future.delayed(const Duration(milliseconds: 500));
    return const Left(ServerFailure('Order not found'));
  }
}