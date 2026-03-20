import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/di/injection_container.dart' as di;
import '../../../cart/domain/entities/cart.dart';
import '../bloc/checkout_bloc.dart';
import '../widgets/checkout_step_indicator.dart';
import '../widgets/shipping_address_section.dart';
import '../widgets/payment_method_section.dart';
import '../widgets/order_summary_section.dart';
import '../widgets/discount_code_section.dart';

class CheckoutPage extends StatelessWidget {
  final Cart cart;

  const CheckoutPage({
    super.key,
    required this.cart,
  });

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => di.sl<CheckoutBloc>()..add(LoadCheckoutData(cart)),
      child: const CheckoutView(),
    );
  }
}

class CheckoutView extends StatefulWidget {
  const CheckoutView({super.key});

  @override
  State<CheckoutView> createState() => _CheckoutViewState();
}

class _CheckoutViewState extends State<CheckoutView> {
  final PageController _pageController = PageController();
  int _currentStep = 0;

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _nextStep() {
    if (_currentStep < 2) {
      setState(() {
        _currentStep++;
      });
      _pageController.nextPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    }
  }

  void _previousStep() {
    if (_currentStep > 0) {
      setState(() {
        _currentStep--;
      });
      _pageController.previousPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Checkout'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            if (_currentStep > 0) {
              _previousStep();
            } else {
              context.pop();
            }
          },
        ),
      ),
      body: BlocConsumer<CheckoutBloc, CheckoutState>(
        listener: (context, state) {
          if (state is CheckoutOrderPlaced) {
            // Navigate to order confirmation
            context.pushReplacement('/order-confirmation/${state.order.id}');
          } else if (state is CheckoutError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: Colors.red,
              ),
            );
          }
        },
        builder: (context, state) {
          if (state is CheckoutLoading) {
            return const Center(child: CircularProgressIndicator());
          } else if (state is CheckoutError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.error_outline,
                    size: 64,
                    color: Colors.grey[400],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Error loading checkout',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    state.message,
                    style: Theme.of(context).textTheme.bodyMedium,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => context.pop(),
                    child: const Text('Go Back'),
                  ),
                ],
              ),
            );
          } else if (state is CheckoutLoaded) {
            return Column(
              children: [
                // Step Indicator
                CheckoutStepIndicator(
                  currentStep: _currentStep,
                  steps: const ['Shipping', 'Payment', 'Review'],
                ),
                
                // Content
                Expanded(
                  child: PageView(
                    controller: _pageController,
                    physics: const NeverScrollableScrollPhysics(),
                    children: [
                      // Step 1: Shipping Address
                      SingleChildScrollView(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Shipping Address',
                              style: Theme.of(context).textTheme.headlineSmall,
                            ),
                            const SizedBox(height: 16),
                            ShippingAddressSection(
                              selectedAddress: state.checkoutData.shippingAddress,
                              availableAddresses: state.availableAddresses,
                              onAddressSelected: (address) {
                                context.read<CheckoutBloc>().add(
                                  UpdateShippingAddress(address),
                                );
                              },
                            ),
                          ],
                        ),
                      ),
                      
                      // Step 2: Payment Method
                      SingleChildScrollView(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Payment Method',
                              style: Theme.of(context).textTheme.headlineSmall,
                            ),
                            const SizedBox(height: 16),
                            PaymentMethodSection(
                              selectedPaymentMethod: state.checkoutData.paymentMethod,
                              availablePaymentMethods: state.availablePaymentMethods,
                              onPaymentMethodSelected: (paymentMethod) {
                                context.read<CheckoutBloc>().add(
                                  UpdatePaymentMethod(paymentMethod),
                                );
                              },
                            ),
                            const SizedBox(height: 24),
                            DiscountCodeSection(
                              discountCode: state.checkoutData.discountCode,
                              isApplying: state.isApplyingDiscount,
                              error: state.discountError,
                              onApplyDiscount: (code) {
                                context.read<CheckoutBloc>().add(
                                  ApplyDiscountCode(code),
                                );
                              },
                              onRemoveDiscount: () {
                                context.read<CheckoutBloc>().add(
                                  const RemoveDiscountCode(),
                                );
                              },
                            ),
                          ],
                        ),
                      ),
                      
                      // Step 3: Order Review
                      SingleChildScrollView(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Order Review',
                              style: Theme.of(context).textTheme.headlineSmall,
                            ),
                            const SizedBox(height: 16),
                            OrderSummarySection(
                              checkoutData: state.checkoutData,
                              isPlacingOrder: state.isPlacingOrder,
                              onPlaceOrder: () {
                                context.read<CheckoutBloc>().add(
                                  const PlaceOrder(),
                                );
                              },
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                
                // Navigation Buttons
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Theme.of(context).cardColor,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.1),
                        blurRadius: 4,
                        offset: const Offset(0, -2),
                      ),
                    ],
                  ),
                  child: SafeArea(
                    child: Row(
                      children: [
                        if (_currentStep > 0)
                          Expanded(
                            child: OutlinedButton(
                              onPressed: _previousStep,
                              child: const Text('Back'),
                            ),
                          ),
                        
                        if (_currentStep > 0) const SizedBox(width: 16),
                        
                        Expanded(
                          child: ElevatedButton(
                            onPressed: _canProceed(state) ? _nextStep : null,
                            child: Text(_getButtonText()),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            );
          }
          
          return const SizedBox.shrink();
        },
      ),
    );
  }

  bool _canProceed(CheckoutLoaded state) {
    switch (_currentStep) {
      case 0:
        return state.checkoutData.shippingAddress != null;
      case 1:
        return state.checkoutData.paymentMethod != null;
      case 2:
        return state.checkoutData.isComplete && !state.isPlacingOrder;
      default:
        return false;
    }
  }

  String _getButtonText() {
    switch (_currentStep) {
      case 0:
        return 'Continue to Payment';
      case 1:
        return 'Review Order';
      case 2:
        return 'Place Order';
      default:
        return 'Continue';
    }
  }
}