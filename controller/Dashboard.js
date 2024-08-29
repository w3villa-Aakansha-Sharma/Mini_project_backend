
const db = require('../config/dbConnection'); 
const util = require('util');

const query = util.promisify(db.query).bind(db);

const getProfileImageUrl = async (req, res) => {
  const urlToken = req.headers.authorization?.split(' ')[1];
  console.log(urlToken);
  if (!urlToken) return res.status(400).json({ msg: 'No token provided' });

  try {
    
    const result = await query(
      'SELECT profile_image_url FROM user_table WHERE verification_hash = ?',
      [urlToken]
    );

    console.log('Query Result:', result); 

    if (Array.isArray(result) && result.length > 0) {
      res.json({ profileImageUrl: result[0].profile_image_url });
    } else {
      res.status(404).json({ msg: 'No profile image found' });
    }
  } catch (error) {
    console.error('Error fetching profile image URL:', error);
    res.status(500).json({ msg: 'An error occurred' });
  }
};

module.exports = { getProfileImageUrl };
