package cn.edu.chd.campus.common;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;

public final class JsonUtils {

  private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
  private static final TypeReference<List<Object>> LIST_TYPE = new TypeReference<>() {};

  private JsonUtils() {
  }

  public static String toJson(Object value) {
    try {
      return OBJECT_MAPPER.writeValueAsString(value == null ? List.of() : value);
    } catch (Exception exception) {
      throw new BusinessException("JSON 序列化失败");
    }
  }

  public static List<Object> toList(Object value) {
    if (value == null) {
      return new ArrayList<>();
    }
    if (value instanceof List<?> list) {
      return new ArrayList<>(list);
    }
    if (value instanceof byte[] bytes) {
      value = new String(bytes);
    }
    String text = String.valueOf(value);
    if (text.isBlank()) {
      return new ArrayList<>();
    }
    try {
      return OBJECT_MAPPER.readValue(text, LIST_TYPE);
    } catch (Exception exception) {
      return new ArrayList<>();
    }
  }
}
