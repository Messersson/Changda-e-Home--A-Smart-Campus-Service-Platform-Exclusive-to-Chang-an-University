package cn.edu.chd.campus.common;

public record ApiResponse<T>(boolean success, T data, String message, Integer code) {

  public static <T> ApiResponse<T> ok(T data) {
    return new ApiResponse<>(true, data, "success", 200);
  }

  public static <T> ApiResponse<T> ok(T data, String message) {
    return new ApiResponse<>(true, data, message, 200);
  }

  public static ApiResponse<Void> ok(String message) {
    return new ApiResponse<>(true, null, message, 200);
  }

  public static ApiResponse<Void> error(String message, int code) {
    return new ApiResponse<>(false, null, message, code);
  }
}
