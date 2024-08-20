const db = require('../config/dbConnection');
const queries = require('../helper/queries');
const errorResponse=require("../helper/errorResponse.json")
const successResponse=require("../helper/successResponse.json")

const verifyEmail = (req, res) => {
    const token = req.query.token;

    if (!token) {
        return res.status(400).json({ msg:errorResponse.invalidVerification});
    }

    const verificationHash = token;

    db.query(queries.getVerificationRecord(verificationHash), [verificationHash], (err, result) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({ msg:errorResponse.databaseErr });
        }

        if (!result || !result.length) {
            return res.status(400).json({ msg:errorResponse.invalidVerification });
        }

        const verificationRecord = result[0];
        const currentTime = new Date();

        // Check if the current time is before the expiration time
        if (currentTime > new Date(verificationRecord.expire_at)) {
            return res.status(400).json({ msg:errorResponse.timeExpired });
        }
        if(verificationRecord.is_processed == 1){
            return res.status(203).json({ msg: 'This link is already Clicked.Please Generate new link to further proceed' });

        }

        // Begin database transaction
        db.beginTransaction((err) => {
            if (err) {
                console.error('Database transaction error:', err);
                return res.status(500).json({ msg:errorResponse.databaseErr });
            }

            // Update email verification status
            db.query(queries.updateVerificationStatus(verificationHash), [verificationHash], (err, updateResult) => {
                if (err) {
                    return db.rollback(() => {
                        console.error('Database update error:', err);
                        return res.status(500).json({ msg: errorResponse.databaseErr});
                    });
                }

                // Insert user data
                const userData = JSON.parse(verificationRecord.user_data);
                console.log(userData)
                db.query(queries.insertUser, 
                    [userData.username, userData.email, userData.password,verificationRecord.verification_hash], 
                    (err) => {
                        if (err) {
                            return db.rollback(() => {
                                console.error('Database insert error:', err);
                                return res.status(500).json({ msg:errorResponse.databaseErr });
                            });
                        }

                        // Update the verification record to set is_processed to 1 and next_action to verify_mobile
                        db.query(queries.updateVerificationDetails, 
                            [verificationHash], 
                            (err) => {
                                if (err) {
                                    return db.rollback(() => {
                                        console.error('Database update error:', err);
                                        return res.status(500).json({ msg:errorResponse.databaseErr });
                                    });
                                }

                                // Commit the transaction
                                db.commit((err) => {
                                    if (err) {
                                        return db.rollback(() => {
                                            console.error('Database commit error:', err);
                                            return res.status(500).json({ msg:errorResponse.databaseErr });
                                        });
                                    }

                                    return res.status(200).json({ msg: successResponse.emailSuccess });
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
