class BrokerUser {
  final String id;
  final String email;
  final String fullName;
  final String? phone;
  final String role;
  final bool isActive;

  BrokerUser({
    required this.id,
    required this.email,
    required this.fullName,
    this.phone,
    required this.role,
    this.isActive = true,
  });

  bool get isBroker => role.toLowerCase() == 'broker';

  factory BrokerUser.fromJson(Map<String, dynamic> json) {
    return BrokerUser(
      id: json['id'] as String,
      email: json['email'] as String? ?? '',
      fullName: json['full_name'] as String? ?? 'Kassim Shaikh',
      phone: json['phone'] as String?,
      role: json['role'] as String? ?? 'broker',
      isActive: json['is_active'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'full_name': fullName,
      'phone': phone,
      'role': role,
      'is_active': isActive,
    };
  }
}
