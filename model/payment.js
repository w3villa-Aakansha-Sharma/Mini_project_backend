
const conn = require('../config/dbConnection');

// Function to create table
const createPayTable = () => {
    const createTableQuery = `
    CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT,
  productName VARCHAR(255),
  amount DECIMAL(10, 2),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

    
  `;

  conn.query(createTableQuery, (error, results) => {
    if (error) {
      console.error('Error creating table:', error);
      return;
    }
    console.log('   Payment Table created ');
  });
};



// Export the functions
module.exports = { createPayTable };

