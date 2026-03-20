import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:hive_flutter/hive_flutter.dart';

import 'app/app.dart';
import 'core/di/injection_container.dart' as di;
import 'core/storage/local_storage.dart';
import 'core/system/system_manager.dart';
import 'features/auth/presentation/bloc/auth_bloc.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Hive for local storage
  await Hive.initFlutter();
  await LocalStorage.init();
  
  // Initialize dependency injection
  await di.init();
  
  // Initialize system manager
  final systemManager = SystemManager();
  await systemManager.initialize();
  
  runApp(const WholesaleECommerceApp());
}

class WholesaleECommerceApp extends StatelessWidget {
  const WholesaleECommerceApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider<AuthBloc>(
          create: (context) => di.sl<AuthBloc>()..add(const AuthStatusChecked()),
        ),
      ],
      child: const App(),
    );
  }
}