import 'package:flutter/material.dart';

import '../core/theme/app_theme.dart';
import '../core/router/app_router.dart';

class App extends StatelessWidget {
  const App({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Wholesale E-Commerce',
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.system,
      routerConfig: AppRouter.router(context),
      debugShowCheckedModeBanner: false,
    );
  }
}