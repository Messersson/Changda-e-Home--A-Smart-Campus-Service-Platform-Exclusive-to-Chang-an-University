package cn.edu.chd.campus.audit;

import cn.edu.chd.campus.security.UserPrincipal;
import java.util.LinkedHashMap;
import java.util.Map;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Aspect
@Component
public class AuditAspect {

  private final AuditLogService auditLogService;

  public AuditAspect(AuditLogService auditLogService) {
    this.auditLogService = auditLogService;
  }

  @Around("@annotation(audited)")
  public Object around(ProceedingJoinPoint joinPoint, Audited audited) throws Throwable {
    try {
      Object result = joinPoint.proceed();
      auditLogService.write(audited.module(), audited.action(), currentUserId(), details(joinPoint, "success"));
      return result;
    } catch (Throwable throwable) {
      auditLogService.write(audited.module(), audited.action(), currentUserId(), details(joinPoint, "failed"));
      throw throwable;
    }
  }

  private Long currentUserId() {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal) {
      return principal.id();
    }
    return null;
  }

  private Map<String, Object> details(ProceedingJoinPoint joinPoint, String status) {
    Map<String, Object> details = new LinkedHashMap<>();
    details.put("status", status);
    details.put("method", joinPoint.getSignature().toShortString());
    return details;
  }
}
