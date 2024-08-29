const db = require('../config/dbConnection');


const getUserProfile = (req, res) => {
    console.log("this is coming in request",req.body.token);
  const userId = req.body.token;
  console.log(userId)

  
  console.log('User token received:', userId);

  const query = 'SELECT * FROM user_table WHERE verification_hash = ?';

  
  console.log('Executing query:', query, 'with parameters:', [userId]);

  db.query(query, [userId], (error, results) => {
    if (error) {
      console.error('Error fetching user profile:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }

    
    console.log('Query results:', results);

    if (results.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = results[0];
    res.status(200).json(user);
  });
};

module.exports = {
  getUserProfile,
};
