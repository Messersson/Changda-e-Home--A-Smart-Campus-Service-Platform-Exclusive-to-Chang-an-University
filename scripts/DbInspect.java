import java.sql.DriverManager;
import java.util.List;
import java.util.Properties;

public class DbInspect {
  public static void main(String[] args) throws Exception {
    Properties props = new Properties();
    props.setProperty("user", System.getenv("MYSQL_USER"));
    props.setProperty("password", System.getenv("MYSQL_PWD"));
    props.setProperty("useSSL", "false");
    props.setProperty("allowPublicKeyRetrieval", "true");
    try (var connection = DriverManager.getConnection(
        "jdbc:mysql://127.0.0.1:3306/changan_campus_service", props)) {
      for (String table : List.of("users", "email_verifications", "audit_logs")) {
        System.out.println("-- " + table);
        try (var statement = connection.prepareStatement("""
            SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_KEY
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
            ORDER BY ORDINAL_POSITION
            """)) {
          statement.setString(1, table);
          try (var rows = statement.executeQuery()) {
            while (rows.next()) {
              System.out.println(rows.getString(1)
                  + "\t" + rows.getString(2)
                  + "\t" + rows.getString(3)
                  + "\t" + rows.getString(4)
                  + "\t" + rows.getString(5));
            }
          }
        }
      }
      try (var statement = connection.prepareStatement("""
          SELECT id, student_id, email, name, role, status
          FROM users
          WHERE student_id LIKE '91%' OR student_id LIKE '92%'
          ORDER BY id DESC
          LIMIT 10
          """);
          var rows = statement.executeQuery()) {
        System.out.println("-- recent e2e-like users");
        while (rows.next()) {
          System.out.println(rows.getLong("id")
              + "\t" + rows.getString("student_id")
              + "\t" + rows.getString("email")
              + "\t" + rows.getString("name")
              + "\t" + rows.getString("role")
              + "\t" + rows.getString("status"));
        }
      }
    }
  }
}
