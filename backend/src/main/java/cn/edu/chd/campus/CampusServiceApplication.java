package cn.edu.chd.campus;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.transaction.annotation.EnableTransactionManagement;

@SpringBootApplication
@EnableTransactionManagement
public class CampusServiceApplication {

  public static void main(String[] args) {
    SpringApplication.run(CampusServiceApplication.class, args);
  }
}
