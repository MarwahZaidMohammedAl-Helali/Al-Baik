import 'package:hive_flutter/hive_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';

class LocalStorage {
  static late Box _box;
  static late SharedPreferences _prefs;
  
  static const String _tokenKey = 'auth_token';
  static const String _userKey = 'user_data';
  static const String _cartKey = 'shopping_cart';
  static const String _settingsKey = 'app_settings';
  
  static Future<void> init() async {
    _box = await Hive.openBox('wholesale_ecommerce');
    _prefs = await SharedPreferences.getInstance();
  }
  
  // Token management
  static Future<void> saveToken(String token) async {
    await _box.put(_tokenKey, token);
  }
  
  static String? getToken() {
    return _box.get(_tokenKey);
  }
  
  static Future<void> clearToken() async {
    await _box.delete(_tokenKey);
  }
  
  // User data management
  static Future<void> saveUserData(Map<String, dynamic> userData) async {
    await _box.put(_userKey, userData);
  }
  
  static Map<String, dynamic>? getUserData() {
    final data = _box.get(_userKey);
    return data != null ? Map<String, dynamic>.from(data) : null;
  }
  
  static Future<void> clearUserData() async {
    await _box.delete(_userKey);
  }
  
  // Shopping cart management
  static Future<void> saveCart(List<Map<String, dynamic>> cartItems) async {
    await _box.put(_cartKey, cartItems);
  }
  
  static List<Map<String, dynamic>> getCart() {
    final data = _box.get(_cartKey, defaultValue: <Map<String, dynamic>>[]);
    return List<Map<String, dynamic>>.from(data);
  }
  
  static Future<void> clearCart() async {
    await _box.delete(_cartKey);
  }
  
  // App settings
  static Future<void> saveSetting(String key, dynamic value) async {
    await _prefs.setString('${_settingsKey}_$key', value.toString());
  }
  
  static String? getSetting(String key) {
    return _prefs.getString('${_settingsKey}_$key');
  }
  
  static Future<void> clearAllData() async {
    await _box.clear();
    await _prefs.clear();
  }
  
  // Utility methods
  static bool get isLoggedIn => getToken() != null;
  
  static Future<void> saveLastSyncTime() async {
    await _prefs.setInt('last_sync_time', DateTime.now().millisecondsSinceEpoch);
  }
  
  static DateTime? getLastSyncTime() {
    final timestamp = _prefs.getInt('last_sync_time');
    return timestamp != null ? DateTime.fromMillisecondsSinceEpoch(timestamp) : null;
  }
}