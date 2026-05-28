package cn.edu.chd.campus.repository;

import cn.edu.chd.campus.common.BusinessException;
import java.sql.ResultSetMetaData;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class GenericRepository {

  private static final Pattern IDENTIFIER = Pattern.compile("[A-Za-z0-9_]+");
  private static final Pattern ORDER_BY = Pattern.compile("[A-Za-z0-9_,.\\s]+");

  private final NamedParameterJdbcTemplate jdbc;
  private final RowMapper<Map<String, Object>> rowMapper = (resultSet, rowNum) -> {
    ResultSetMetaData metaData = resultSet.getMetaData();
    Map<String, Object> row = new LinkedHashMap<>();
    for (int index = 1; index <= metaData.getColumnCount(); index += 1) {
      row.put(metaData.getColumnLabel(index), resultSet.getObject(index));
    }
    return row;
  };

  public GenericRepository(NamedParameterJdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public List<Map<String, Object>> query(String sql, Map<String, ?> params) {
    return jdbc.query(sql, params == null ? Map.of() : params, rowMapper);
  }

  public Optional<Map<String, Object>> queryOne(String sql, Map<String, ?> params) {
    try {
      return Optional.ofNullable(jdbc.queryForObject(sql, params == null ? Map.of() : params, rowMapper));
    } catch (EmptyResultDataAccessException exception) {
      return Optional.empty();
    }
  }

  public int update(String sql, Map<String, ?> params) {
    return jdbc.update(sql, params == null ? Map.of() : params);
  }

  public List<Map<String, Object>> find(String table, Map<String, ?> filters, String orderBy) {
    StringBuilder sql = new StringBuilder("SELECT * FROM ").append(safeIdentifier(table));
    MapSqlParameterSource params = new MapSqlParameterSource();
    appendWhere(sql, params, filters);
    if (orderBy != null && !orderBy.isBlank()) {
      sql.append(" ORDER BY ").append(safeOrderBy(orderBy));
    }
    return jdbc.query(sql.toString(), params, rowMapper);
  }

  public Optional<Map<String, Object>> findById(String table, Long id) {
    if (id == null) {
      throw new BusinessException("ID 不能为空");
    }
    return queryOne("SELECT * FROM " + safeIdentifier(table) + " WHERE id = :id", Map.of("id", id));
  }

  public Optional<Map<String, Object>> findOne(String table, Map<String, ?> filters) {
    StringBuilder sql = new StringBuilder("SELECT * FROM ").append(safeIdentifier(table));
    MapSqlParameterSource params = new MapSqlParameterSource();
    appendWhere(sql, params, filters);
    sql.append(" LIMIT 1");
    try {
      return Optional.ofNullable(jdbc.queryForObject(sql.toString(), params, rowMapper));
    } catch (EmptyResultDataAccessException exception) {
      return Optional.empty();
    }
  }

  public Long insert(String table, Map<String, ?> values) {
    if (values == null || values.isEmpty()) {
      throw new BusinessException("新增数据不能为空");
    }
    StringBuilder columns = new StringBuilder();
    StringBuilder placeholders = new StringBuilder();
    MapSqlParameterSource params = new MapSqlParameterSource();
    int index = 0;
    for (Map.Entry<String, ?> entry : values.entrySet()) {
      String column = safeIdentifier(entry.getKey());
      if (index > 0) {
        columns.append(", ");
        placeholders.append(", ");
      }
      columns.append(column);
      placeholders.append(':').append(column);
      params.addValue(column, entry.getValue());
      index += 1;
    }

    String sql = "INSERT INTO " + safeIdentifier(table) + " (" + columns + ") VALUES (" + placeholders + ")";
    KeyHolder keyHolder = new GeneratedKeyHolder();
    jdbc.update(sql, params, keyHolder, new String[] {"id"});
    Number key = keyHolder.getKey();
    return key == null ? null : key.longValue();
  }

  public int updateById(String table, Long id, Map<String, ?> values) {
    if (id == null) {
      throw new BusinessException("ID 不能为空");
    }
    if (values == null || values.isEmpty()) {
      return 0;
    }
    StringBuilder set = new StringBuilder();
    MapSqlParameterSource params = new MapSqlParameterSource("id", id);
    int index = 0;
    for (Map.Entry<String, ?> entry : values.entrySet()) {
      String column = safeIdentifier(entry.getKey());
      if (index > 0) {
        set.append(", ");
      }
      set.append(column).append(" = :").append(column);
      params.addValue(column, entry.getValue());
      index += 1;
    }
    return jdbc.update("UPDATE " + safeIdentifier(table) + " SET " + set + " WHERE id = :id", params);
  }

  public int deleteById(String table, Long id) {
    if (id == null) {
      throw new BusinessException("ID 不能为空");
    }
    return jdbc.update("DELETE FROM " + safeIdentifier(table) + " WHERE id = :id", Map.of("id", id));
  }

  public long count(String table, Map<String, ?> filters) {
    StringBuilder sql = new StringBuilder("SELECT COUNT(*) FROM ").append(safeIdentifier(table));
    MapSqlParameterSource params = new MapSqlParameterSource();
    appendWhere(sql, params, filters);
    Long count = jdbc.queryForObject(sql.toString(), params, Long.class);
    return count == null ? 0 : count;
  }

  private void appendWhere(StringBuilder sql, MapSqlParameterSource params, Map<String, ?> filters) {
    if (filters == null || filters.isEmpty()) {
      return;
    }
    int index = 0;
    for (Map.Entry<String, ?> entry : filters.entrySet()) {
      if (entry.getValue() == null) {
        continue;
      }
      String column = safeIdentifier(entry.getKey());
      String name = "p" + index;
      sql.append(index == 0 ? " WHERE " : " AND ");
      if (entry.getValue() instanceof Collection<?> values) {
        sql.append(column).append(" IN (:").append(name).append(')');
        params.addValue(name, values);
      } else {
        sql.append(column).append(" = :").append(name);
        params.addValue(name, entry.getValue());
      }
      index += 1;
    }
  }

  private String safeIdentifier(String value) {
    if (value == null || !IDENTIFIER.matcher(value).matches()) {
      throw new BusinessException("非法数据标识");
    }
    return value;
  }

  private String safeOrderBy(String value) {
    if (!ORDER_BY.matcher(value).matches()) {
      throw new BusinessException("非法排序字段");
    }
    return value;
  }
}
