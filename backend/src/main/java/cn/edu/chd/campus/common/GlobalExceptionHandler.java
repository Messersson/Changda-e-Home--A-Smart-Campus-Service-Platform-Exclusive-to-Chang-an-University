package cn.edu.chd.campus.common;

import jakarta.validation.ConstraintViolationException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.validation.BindException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

  private static final Logger LOGGER = LoggerFactory.getLogger(GlobalExceptionHandler.class);

  @ExceptionHandler(BusinessException.class)
  public ResponseEntity<ApiResponse<Void>> handleBusiness(BusinessException exception) {
    return ResponseEntity
        .status(exception.getStatus())
        .body(ApiResponse.error(exception.getMessage(), exception.getStatus().value()));
  }

  @ExceptionHandler({MethodArgumentNotValidException.class, BindException.class})
  public ResponseEntity<ApiResponse<Void>> handleValidation(Exception exception) {
    String message = "参数校验失败";
    if (exception instanceof MethodArgumentNotValidException validException
        && validException.getBindingResult().hasErrors()) {
      message = validException.getBindingResult().getAllErrors().get(0).getDefaultMessage();
    }
    if (exception instanceof BindException bindException
        && bindException.getBindingResult().hasErrors()) {
      message = bindException.getBindingResult().getAllErrors().get(0).getDefaultMessage();
    }
    return ResponseEntity.badRequest().body(ApiResponse.error(message, 400));
  }

  @ExceptionHandler(ConstraintViolationException.class)
  public ResponseEntity<ApiResponse<Void>> handleConstraint(ConstraintViolationException exception) {
    return ResponseEntity.badRequest().body(ApiResponse.error(exception.getMessage(), 400));
  }

  @ExceptionHandler(DuplicateKeyException.class)
  public ResponseEntity<ApiResponse<Void>> handleDuplicate() {
    return ResponseEntity.badRequest().body(ApiResponse.error("数据已存在，请勿重复提交", 400));
  }

  @ExceptionHandler(AuthenticationException.class)
  public ResponseEntity<ApiResponse<Void>> handleAuthentication() {
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("登录已过期，请重新登录", 401));
  }

  @ExceptionHandler(AccessDeniedException.class)
  public ResponseEntity<ApiResponse<Void>> handleAccessDenied() {
    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.error("没有操作权限", 403));
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ApiResponse<Void>> handleUnknown(Exception exception) {
    LOGGER.error("Unhandled request exception", exception);
    return ResponseEntity
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(ApiResponse.error("服务器内部错误，请稍后重试", 500));
  }
}
