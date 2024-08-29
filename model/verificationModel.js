const conn = require('../config/dbConnection');


const createTable = () => {
  const createTableQuery = `
    CREATE TABLE  if not exists user_verification_table (
    id INT AUTO_INCREMENT PRIMARY KEY,
    unique_reference_id VARCHAR(255) UNIQUE NOT NULL ,
    email varchar(500) unique,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    verification_hash varchar(255) NULL,
    expire_at DATETIME NULL,
    otp_expire_at DATETIME NULL,
    email_verified_at DATETIME NULL,
    mobile_verified_at DATETIME NULL,
    is_active BOOLEAN DEFAULT TRUE,
    next_action varchar(50) default 'email_verify',
    retry_count INT DEFAULT 0,
    comment TEXT NULL,
    user_data JSON NULL,
    is_email_verified boolean default false,
    is_mobile_verified boolean default false,
    is_processed boolean default false,
    mobile_number varchar(15),
    
    mobile_otp VARCHAR(6) NULL,
    role varchar(15) default 'user'
);

  `;

  conn.query(createTableQuery, (error, results) => {
    if (error) {
      console.error('Error creating table:', error);
      return;
    }
    console.log('   Verification Table created ');
  });
};




module.exports = { createTable };
