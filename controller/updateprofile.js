const db = require('../config/dbConnection');

const updateProfile = async (req, res) => {
    console.log(req.body);
    const { username, address, profilePicture, location } = req.body;
    const token = req.body.token;

    // Extract latitude and longitude from the location object
    const latitude = location ? location.lat : null;
    const longitude = location ? location.lng : null;

    console.log(token);
    console.log(username);
    console.log(address);
    console.log(profilePicture);
    console.log(location);

    // Update query with latitude and longitude
    const query = `
        UPDATE user_table
        SET username = ?, address = ?, profile_image_url = ?, latitude = ?, longitude = ?
        WHERE verification_hash = ?;
    `;

    db.query(query, [username, address, profilePicture, latitude, longitude, token], (err, result) => {
        if (err) {
            console.error('Error updating user:', err);
            return res.status(500).json({ message: 'Failed to update user' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'User updated successfully' });
    });
};

module.exports = { updateProfile };
