const DatabaseAdapter = require('./database/adapter');

async function addTestUser() {
  try {
    console.log('正在连接数据库...');
    await DatabaseAdapter.connect();
    
    console.log('正在添加测试用户...');
    
    const testUser = {
      student_id: '20220001',
      email: 'test@chd.edu.cn',
      password: '123456',
      name: '测试用户',
      major: '计算机科学与技术',
      grade: '2022',
      role: 'student',
      status: 'active',
      created_at: new Date()
    };
    
    try {
      const result = await DatabaseAdapter.insert('users', testUser);
      console.log('✅ 测试用户添加成功！');
      console.log('用户ID:', result.insertId);
      console.log('学号:', testUser.student_id);
      console.log('密码:', testUser.password);
      console.log('邮箱:', testUser.email);
    } catch (error) {
      if (error.message.includes('Duplicate entry')) {
        console.log('⚠️  测试用户已存在，跳过添加');
      } else {
        throw error;
      }
    }
    
    console.log('\n正在验证用户是否存在...');
    const users = await DatabaseAdapter.select('users', { student_id: '20220001' });
    console.log('查询结果:', users);
    
    await DatabaseAdapter.disconnect();
    console.log('\n操作完成，数据库连接已断开');
    
  } catch (error) {
    console.error('❌ 操作失败:', error.message);
    process.exit(1);
  }
}

addTestUser();
