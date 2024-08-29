const db=require("../config/dbConnection")
const queries = {
    checkUserExists: (email) => `
      SELECT * FROM user_table WHERE LOWER(email) = LOWER(?);
    `,
    getVerificationRecord: (verificationHash) => `
      SELECT * FROM user_verification_table WHERE verification_hash = ?;
    `,
    updateVerificationStatus: (verificationHash) => `
      UPDATE user_verification_table 
      SET is_email_verified = true, email_verified_at = NOW(), is_processed = TRUE 
      WHERE verification_hash = ?;
    `,
    insertUser: `
      INSERT INTO user_table (username, email, password, next_action, verification_hash, unique_reference_id) 
      VALUES (?, ?, ?, 'mobile_verify', ?,?);
    `,
    updateVerificationDetails: `
      UPDATE user_verification_table
      SET is_processed = 1, next_action = 'verify_mobile'
      WHERE verification_hash = ?
    `,
    checkUsersExists: `
      SELECT * FROM user_verification_table WHERE LOWER(email) = LOWER(?);
    `,
    updateVerificationCredentials: `
      UPDATE user_verification_table
      SET verification_hash = ?, retry_count = retry_count + 1, expire_at = DATE_ADD(NOW(), INTERVAL 2 MINUTE)
      WHERE LOWER(email) = LOWER(?)
    `,
    selectVerificationRecordByHash: `
      SELECT * FROM user_verification_table WHERE verification_hash = ?;
    `,
    updateMobileVerificationStatus: `
      UPDATE user_verification_table
      SET is_mobile_verified = true, mobile_verified_at = NOW(), next_action = NULL
      WHERE verification_hash = ?;
    `,
    updateNextActionToNull: `
      UPDATE user_table
      SET next_action = NULL
      WHERE email = (
          SELECT email
          FROM user_verification_table
          WHERE verification_hash = ?
      );
    `,getUserByEmail: (email) => {
        const query = 'SELECT * FROM user_table WHERE email = ?';
        return new Promise((resolve, reject) => {
          db.query(query, [email], (err, results) => {
            if (err) return reject(err);
            resolve(results[0]);
          });
        });
      },
    
      insertGoogleUser: (user) => {
        const query = 'INSERT INTO user_table SET ?';
        return new Promise((resolve, reject) => {
          db.query(query, user, (err, result) => {
            if (err) return reject(err);
            resolve(result);
          });
        });
      },
    
      updateUserByEmail: (email, updates) => {
        const query = 'UPDATE user_table SET ? WHERE email = ?';
        return new Promise((resolve, reject) => {
          db.query(query, [updates, email], (err, result) => {
            if (err) return reject(err);
            resolve(result);
          });
        });
      }
  };
  
  module.exports = queries;
  