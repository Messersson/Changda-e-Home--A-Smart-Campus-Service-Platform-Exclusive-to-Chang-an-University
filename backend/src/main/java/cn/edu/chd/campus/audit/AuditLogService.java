package cn.edu.chd.campus.audit;

import cn.edu.chd.campus.common.JsonUtils;
import cn.edu.chd.campus.repository.GenericRepository;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditLogService {

  private static final Logger LOGGER = LoggerFactory.getLogger(AuditLogService.class);

  private final GenericRepository repository;

  public AuditLogService(GenericRepository repository) {
    this.repository = repository;
  }

  @Transactional(propagation = Propagation.REQUIRES_NEW)
  public void write(String module, String action, Long operatorId, Map<String, Object> details) {
    try {
      Map<String, Object> values = new LinkedHashMap<>();
      values.put("module", module);
      values.put("action", action);
      values.put("operator_type", operatorId == null ? "system" : "user");
      values.put("operator_id", operatorId);
      values.put("details", JsonUtils.toJson(details == null ? Map.of() : details));
      repository.insert("audit_logs", values);
    } catch (Exception exception) {
      LOGGER.warn("Write audit log failed: {}", exception.getMessage());
    }
  }
}
