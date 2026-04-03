enum UserRole {
  admin,
  employee,
  customer;

  String get displayName {
    switch (this) {
      case UserRole.admin:
        return 'Admin';
      case UserRole.employee:
        return 'Employee';
      case UserRole.customer:
        return 'Customer';
    }
  }

  static UserRole fromString(String role) {
    switch (role.toLowerCase()) {
      case 'admin':
        return UserRole.admin;
      case 'employee':
        return UserRole.employee;
      case 'customer':
        return UserRole.customer;
      default:
        return UserRole.customer;
    }
  }
}