const db = require('../config/dbConnection');
const queries = require('../helper/queries');

const verifyEmail = (req, res) => {
    const token = req.query.token;

    if (!token) {
        return res.status(400).json({ msg: 'Invalid verification link' });
    }

    const verificationHash = token;

    db.query(queries.getVerificationRecord(verificationHash), [verificationHash], (err, result) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({ msg: 'Database query error' });
        }

        if (!result || !result.length) {
            return res.status(400).json({ msg: 'Invalid verification link' });
        }

        const verificationRecord = result[0];
        const currentTime = new Date();

        // Check if the current time is before the expiration time
        if (currentTime > new Date(verificationRecord.expire_at)) {
            return res.status(400).json({ msg: 'Email verification time expired' });
        }
        if(verificationRecord.is_processed == 1){
            return res.status(203).json({ msg: 'This link is already Clicked.Please Generate new link to further proceed' });

        }

        // Begin database transaction
        db.beginTransaction((err) => {
            if (err) {
                console.error('Database transaction error:', err);
                return res.status(500).json({ msg: 'Database transaction error' });
            }

            // Update email verification status
            db.query(queries.updateVerificationStatus(verificationHash), [verificationHash], (err, updateResult) => {
                if (err) {
                    return db.rollback(() => {
                        console.error('Database update error:', err);
                        return res.status(500).json({ msg: 'Database update error' });
                    });
                }

                // Insert user data
                const userData = JSON.parse(verificationRecord.user_data);
                console.log(userData)
                db.query(queries.insertUser, 
                    [userData.username, userData.email, userData.password, userData.mobile_number,verificationRecord.verification_hash], 
                    (err) => {
                        if (err) {
                            return db.rollback(() => {
                                console.error('Database insert error:', err);
                                return res.status(500).json({ msg: 'Database insert error' });
                            });
                        }

                        // Update the verification record to set is_processed to 1 and next_action to verify_mobile
                        db.query(queries.updateVerificationDetails, 
                            [verificationHash], 
                            (err) => {
                                if (err) {
                                    return db.rollback(() => {
                                        console.error('Database update error:', err);
                                        return res.status(500).json({ msg: 'Database update error' });
                                    });
                                }

                                // Commit the transaction
                                db.commit((err) => {
                                    if (err) {
                                        return db.rollback(() => {
                                            console.error('Database commit error:', err);
                                            return res.status(500).json({ msg: 'Database commit error' });
                                        });
                                    }

                                    return res.status(200).json({ msg: 'Email verified and user created successfully' });
                                });
                            }
                        );
                    }
                );
            });
        });
    });
};

module.exports = { verifyEmail };
