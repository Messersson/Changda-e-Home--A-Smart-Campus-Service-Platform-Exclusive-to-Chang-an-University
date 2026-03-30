const connectionManager = require('./connectionManager');

class DatabaseAdapter {
  static async connect() {
    return await connectionManager.connect();
  }

  static async disconnect() {
    return await connectionManager.disconnect();
  }

  static async query(sql, params = [], retries = 3) {
    return await connectionManager.query(sql, params, retries);
  }

  static async select(table, where = {}, fields = '*') {
    const conditions = Object.keys(where).map(key => `${key} = ?`).join(' AND ');
    const values = Object.values(where);
    const sql = conditions 
      ? `SELECT ${fields} FROM ${table} WHERE ${conditions}`
      : `SELECT ${fields} FROM ${table}`;
    const [rows] = await this.query(sql, values);
    return rows;
  }

  static async insert(table, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
    
    try {
      const [result] = await this.query(sql, values);
      return { insertId: result.insertId, affectedRows: result.affectedRows };
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('数据已存在');
      }
      throw error;
    }
  }

  static async update(table, data, where) {
    const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const whereClause = Object.keys(where).map(key => `${key} = ?`).join(' AND ');
    const values = [...Object.values(data), ...Object.values(where).map(v => Number(v))];
    const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
    console.log('[DB Update]', sql, values);
    try {
      const [result] = await this.query(sql, values);
      console.log('[DB Update Result]', result);
      return { affectedRows: result.affectedRows };
    } catch (error) {
      console.error('[DB Update Error]', error);
      throw error;
    }
  }

  static async delete(table, where) {
    const whereClause = Object.keys(where).map(key => `${key} = ?`).join(' AND ');
    const values = Object.values(where);
    const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
    
    try {
      const [result] = await this.query(sql, values);
      return { affectedRows: result.affectedRows };
    } catch (error) {
      throw error;
    }
  }

  static async transaction(callback) {
    const connection = await this.pool.getConnection();
    
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async batchInsert(table, dataArray) {
    if (!dataArray || dataArray.length === 0) {
      return { insertId: 0, affectedRows: 0 };
    }

    const keys = Object.keys(dataArray[0]);
    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
    
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      
      let lastInsertId = 0;
      for (const data of dataArray) {
        const values = Object.values(data);
        const [result] = await connection.query(sql, values);
        lastInsertId = result.insertId;
      }
      
      await connection.commit();
      return { insertId: lastInsertId, affectedRows: dataArray.length };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async selectWithJoin(table, joins, where = {}, fields = '*') {
    let sql = `SELECT ${fields} FROM ${table}`;
    const values = [];

    for (const join of joins) {
      sql += ` ${join.type || 'LEFT'} JOIN ${join.table} ON ${join.on}`;
    }

    if (Object.keys(where).length > 0) {
      const conditions = Object.keys(where).map(key => `${key} = ?`).join(' AND ');
      sql += ` WHERE ${conditions}`;
      values.push(...Object.values(where));
    }

    const [rows] = await this.query(sql, values);
    return rows;
  }

  static async count(table, where = {}) {
    const conditions = Object.keys(where).map(key => `${key} = ?`).join(' AND ');
    const values = Object.values(where);
    const sql = conditions 
      ? `SELECT COUNT(*) as count FROM ${table} WHERE ${conditions}`
      : `SELECT COUNT(*) as count FROM ${table}`;
    const [result] = await this.query(sql, values);
    return result[0].count;
  }

  static async exists(table, where) {
    const count = await this.count(table, where);
    return count > 0;
  }
}

module.exports = DatabaseAdapter;