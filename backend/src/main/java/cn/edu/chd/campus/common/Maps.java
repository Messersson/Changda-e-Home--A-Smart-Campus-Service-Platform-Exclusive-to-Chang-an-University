package cn.edu.chd.campus.common;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public final class Maps {

  private static final DateTimeFormatter DATE_TIME_FORMATTER =
      DateTimeFormatter.ISO_OFFSET_DATE_TIME.withZone(ZoneId.of("Asia/Shanghai"));

  private Maps() {
  }

  public static Map<String, Object> api(Map<String, Object> row) {
    Map<String, Object> result = new LinkedHashMap<>();
    row.forEach((key, value) -> {
      Object converted = convert(value);
      result.put(key, converted);
      result.put(toCamel(key), converted);
    });
    return result;
  }

  public static List<Map<String, Object>> apiList(List<Map<String, Object>> rows) {
    return rows.stream().map(Maps::api).toList();
  }

  public static Long longValue(Object value) {
    if (value == null) {
      return null;
    }
    if (value instanceof Number number) {
      return number.longValue();
    }
    return Long.parseLong(String.valueOf(value));
  }

  public static Integer intValue(Object value, int defaultValue) {
    if (value == null || String.valueOf(value).isBlank()) {
      return defaultValue;
    }
    if (value instanceof Number number) {
      return number.intValue();
    }
    return Integer.parseInt(String.valueOf(value));
  }

  public static BigDecimal decimalValue(Object value) {
    if (value == null || String.valueOf(value).isBlank()) {
      return BigDecimal.ZERO;
    }
    if (value instanceof BigDecimal decimal) {
      return decimal;
    }
    if (value instanceof Number number) {
      return BigDecimal.valueOf(number.doubleValue());
    }
    return new BigDecimal(String.valueOf(value));
  }

  public static String stringValue(Object value, String defaultValue) {
    if (value == null) {
      return defaultValue;
    }
    return String.valueOf(value);
  }

  public static Map<String, Object> mutable(Map<String, Object> source) {
    return new LinkedHashMap<>(source == null ? Map.of() : source);
  }

  public static Object convert(Object value) {
    if (value instanceof Timestamp timestamp) {
      return DATE_TIME_FORMATTER.format(timestamp.toInstant());
    }
    if (value instanceof java.sql.Date date) {
      return date.toLocalDate().toString();
    }
    if (value instanceof byte[] bytes) {
      return new String(bytes);
    }
    return value;
  }

  public static String toCamel(String value) {
    String lower = value.toLowerCase(Locale.ROOT);
    StringBuilder builder = new StringBuilder();
    boolean upperNext = false;
    for (char item : lower.toCharArray()) {
      if (item == '_') {
        upperNext = true;
      } else if (upperNext) {
        builder.append(Character.toUpperCase(item));
        upperNext = false;
      } else {
        builder.append(item);
      }
    }
    return builder.toString();
  }
}
