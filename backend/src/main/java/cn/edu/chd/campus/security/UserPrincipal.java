package cn.edu.chd.campus.security;

public record UserPrincipal(Long id, String studentId, String email, String role) {

  public boolean isAdmin() {
    return "admin".equalsIgnoreCase(role);
  }

  public boolean isMerchant() {
    return "merchant".equalsIgnoreCase(role);
  }
}
