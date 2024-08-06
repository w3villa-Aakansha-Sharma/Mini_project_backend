const conn = require('../config/dbConnection');

// Function to create table
const createTable = () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS user_table (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255),
      next_action varchar(50) default null,
      verification_hash varchar(255) NULL,
      email VARCHAR(255) ,
      password VARCHAR(100),
      mobile_number varchar(15),
      google_id varchar(255) default null
    );
  `;

  conn.query(createTableQuery, (error, results) => {
    if (error) {
      console.error('Error creating table:', error);
      return;
    }
    console.log('Table created');
  });
};

// Call the function to ensure table is created
createTable();

// Export the functions
module.exports = { createTable };
