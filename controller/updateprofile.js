const db = require('../config/dbConnection');
const path = require('path');
const fs = require('fs');

const updateProfile = async (req, res) => {
    console.log(req.body)
    const { username, address, profilePicture } = req.body;
    const token = req.body.token;
    console.log(token);
    console.log(username);
    console.log(address);
    console.log(profilePicture);

 
    // Example query to update user information
    const query = `
        UPDATE user_table
        SET username = ?, address = ?, profile_image_url = ?
        WHERE verification_hash = ?;
    `;
console.log(query);
    db.query(query, [username, address, profilePicture, token], (err, result) => {
        if (err) {
            console.error('Error updating user:', err);
            return res.status(500).json({ message: 'Failed to update user' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'User updated successfully' });
    });};

module.exports = { updateProfile };
