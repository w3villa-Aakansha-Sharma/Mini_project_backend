const conn = require('../config/dbConnection');

const createPayTable = () => {
    const createTableQuery = `
    CREATE TABLE IF NOT EXISTS payment (
      id INT AUTO_INCREMENT PRIMARY KEY,
      usertoken VARCHAR(255) NOT NULL,
      plan ENUM('silver', 'gold') NOT NULL,
      amount DECIMAL(10, 2) NOT NULL,
      status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      refund_id VARCHAR(255) DEFAULT NULL,
      payment_intent_id VARCHAR(255) DEFAULT NULL,
      amount_received DECIMAL(10, 2) DEFAULT NULL
    );
  `;

    conn.query(createTableQuery, (error, results) => {
        if (error) {
            console.error('Error creating table:', error);
            return;
        }
        console.log('Payment Table created');
    });
};

module.exports = { createPayTable };
