const { validationResult } = require('express-validator');
const db = require('../config/dbConnection');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const queries = require('../helper/queries');
const errorResponse = require("../helper/errorResponse.json");
const successResponse = require("../helper/successResponse.json");
require('dotenv').config();

const login = (req, res) => {
    console.log(req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const email = req.body.email;
    const password = req.body.password;

    // Check if user exists
    db.query(queries.checkUserExists(email), [email], (err, result) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).send({ msg: errorResponse.databaseErr });
        }

        if (!result.length) {
            return res.status(202).send({ msg: errorResponse.invalidCredentials });
        }

        const user = result[0];
        const verification_hash = user.verification_hash;
        console.log("Verification hash is: " + verification_hash);

        if (user.next_action === 'mobile_verify') {
            console.log('User needs to complete mobile verification');
            return res.status(201).send({ msg: errorResponse.incompleteVerification, verification_hash });
        }

        // Compare the provided password with the hashed password
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
                console.error('Error comparing passwords:', err);
                return res.status(500).send({ msg: errorResponse.invalidCredentials });
            }

            if (!isMatch) {
                return res.status(202).send({ msg: errorResponse.invalidCredentials });
            }

            // Fetch the role from user_table
            db.query('SELECT role FROM user_table WHERE verification_hash = ?', [verification_hash], (err, roleResult) => {
                if (err) {
                    console.error('Database query error for user role:', err);
                    return res.status(500).send({ msg: errorResponse.databaseErr });
                }

                if (!roleResult.length) {
                    return res.status(500).send({ msg: errorResponse.databaseErr });
                }

                const userRole = roleResult[0].role;

                // Generate JWT token with role
                const token = jwt.sign(
                    { username: user.username, email: user.email, role: userRole },
                    process.env.JWT_SECRET,
                    { expiresIn: '24h' }
                );
                console.log('Generated token:', token);

                return res.status(200).json({ msg: successResponse.loginSuccess, token });
            });
        });
    });
};

module.exports = { login };
