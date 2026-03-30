const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function initDatabase() {
  console.log('========================================');
  console.log('长安大学校园服务平台 - 数据库初始化');
  console.log('========================================\n');

  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'chd_campus'
  };

  console.log('数据库配置:');
  console.log(`  主机: ${config.host}:${config.port}`);
  console.log(`  用户: ${config.user}`);
  console.log(`  数据库: ${config.database}\n`);

  try {
    console.log('1. 连接 MySQL 服务器...');
    const connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password
    });
    console.log('   ✓ 连接成功\n');

    console.log('2. 创建数据库...');
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${config.database} DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`   ✓ 数据库 "${config.database}" 创建成功\n`);

    await connection.end();

    console.log('3. 连接到数据库...');
    const dbConnection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      multipleStatements: true
    });
    console.log('   ✓ 连接成功\n');

    console.log('4. 读取初始化脚本...');
    const sqlPath = path.join(__dirname, 'init.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('   ✓ 读取成功\n');

    console.log('5. 执行初始化脚本...');
    await dbConnection.query(sql);
    console.log('   ✓ 执行成功\n');

    console.log('6. 验证数据表...');
    const [tables] = await dbConnection.query('SHOW TABLES');
    console.log(`   ✓ 共创建 ${tables.length} 张数据表:`);
    tables.forEach((table, index) => {
      console.log(`     ${index + 1}. ${Object.values(table)[0]}`);
    });
    console.log('');

    console.log('7. 验证初始数据...');
    const [users] = await dbConnection.query('SELECT COUNT(*) as count FROM users');
    const [products] = await dbConnection.query('SELECT COUNT(*) as count FROM supermarket_products');
    const [snacks] = await dbConnection.query('SELECT COUNT(*) as count FROM snacks');
    const [schools] = await dbConnection.query('SELECT COUNT(*) as count FROM driving_schools');

    console.log('   ✓ 初始数据:');
    console.log(`     - 用户: ${users[0].count} 条`);
    console.log(`     - 超市商品: ${products[0].count} 条`);
    console.log(`     - 小吃摊菜品: ${snacks[0].count} 条`);
    console.log(`     - 驾校: ${schools[0].count} 条`);
    console.log('');

    await dbConnection.end();

    console.log('========================================');
    console.log('✓ 数据库初始化完成！');
    console.log('========================================\n');
    console.log('默认管理员账号:');
    console.log('  学号: 2024000000');
    console.log('  密码: admin123');
    console.log('  邮箱: admin@chd.edu.cn\n');
    console.log('现在可以启动后端服务了！');
    console.log('命令: npm run dev\n');

  } catch (error) {
    console.error('\n========================================');
    console.error('✗ 数据库初始化失败！');
    console.error('========================================\n');
    console.error('错误信息:', error.message);
    console.error('\n请检查:');
    console.error('1. MySQL 服务是否已启动');
    console.error('2. 数据库连接配置是否正确 (backend/.env)');
    console.error('3. 数据库用户权限是否足够\n');
    process.exit(1);
  }
}

if (require.main === module) {
  initDatabase();
}

module.exports = initDatabase;