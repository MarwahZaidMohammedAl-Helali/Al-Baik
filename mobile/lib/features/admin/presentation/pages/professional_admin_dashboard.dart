import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../../../../core/constants/api_constants.dart';
import '../../../../core/storage/local_storage.dart';
import 'add_category_page.dart';
import 'add_product_page.dart';
import 'manage_categories_page.dart';
import 'manage_products_page.dart';

class ProfessionalAdminDashboard extends StatefulWidget {
  const ProfessionalAdminDashboard({super.key});

  @override
  State<ProfessionalAdminDashboard> createState() => _ProfessionalAdminDashboardState();
}

class _ProfessionalAdminDashboardState extends State<ProfessionalAdminDashboard>
    with SingleTickerProviderStat