const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/dbConnection'); // Adjust the path as needed

const app = express();

// Middleware setup
app.use(session({
  secret: 'your-secret-key', // Replace with a secure secret key
  resave: false,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

// Configure Google Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID, // Replace with your Google Client ID
  clientSecret: process.env.CLIENT_SECRET, // Replace with your Google Client Secret
  callbackURL: 'http://localhost:8000/api/auth/google/callback'
},
async (accessToken, refreshToken, profile, done) => {
  try {
    console.log('Google profile:', profile);

    const email = profile.emails[0].value;
    const username = profile.displayName;
    const googleId = profile.id;
    const imageUrl = profile.photos[0]?.value;

    // Generate a new verification hash
    const verificationHash = crypto.randomBytes(16).toString('hex');

    // Check if user exists in the user_verification_table
    db.query('SELECT * FROM user_verification_table WHERE email = ?', [email], (err, verificationResults) => {
      if (err) return done(err);

      let isNewUser = verificationResults.length === 0;

      if (isNewUser) {
        // User does not exist, insert new user into user_verification_table with next_action = 'mobile_verify'
        db.query(`
          INSERT INTO user_verification_table 
          (unique_reference_id, email, verification_hash, user_data, is_email_verified, next_action) 
          VALUES (?, ?, ?, ?, 1, 'mobile_verify')`,
          [crypto.randomBytes(16).toString('hex'), email, verificationHash, JSON.stringify({ username, email })],
          (err) => {
            if (err) return done(err);
            console.log('User inserted into the verification table:', { username, email, verification_hash: verificationHash });
          }
        );
      } else {
        // User exists, update user_verification_table with new verification_hash
        db.query(`
          UPDATE user_verification_table 
          SET verification_hash = ?, user_data = ?
          WHERE email = ?`,
          [verificationHash, JSON.stringify({ username, email }), email],
          (err) => {
            if (err) return done(err);
            console.log('User updated in the verification table:', { username, email, verification_hash: verificationHash });
          }
        );
      }

      // Regardless of whether the user is newly inserted or updated in user_verification_table,
      // handle insertion/updating in the user table
      db.query('SELECT * FROM user_table WHERE email = ?', [email], (err, userResults) => {
        if (err) return done(err);

        if (userResults.length === 0) {
          // User does not exist in user table, insert new user
          db.query(`
            INSERT INTO user_table 
            (username, email, google_id, verification_hash) 
            VALUES (?, ?, ?, ?)`,
            [username, email, googleId, verificationHash],
            (err) => {
              if (err) return done(err);
              console.log('User inserted into the user table:', { username, email, google_id: googleId });
              return done(null, { username, email, verification_hash: verificationHash, next_action: 'mobile_verify' });
            }
          );
        } else {
          // User exists in user table, update user information
          db.query(`
            UPDATE user_table
            SET username = ?, google_id = ?
            WHERE email = ?`,
            [username, googleId, email],
            (err) => {
              if (err) return done(err);
              console.log('User updated in the user table:', { username, email, google_id: googleId, image_url: imageUrl });
              return done(null, { ...userResults[0] });
            }
          );
        }
      });
    });
  } catch (error) {
    console.error('Error during authentication:', error);
    return done(error);
  }
}));

// Serialize user for the session
passport.serializeUser((user, done) => {
  done(null, user.email); // Use a unique identifier (like email or ID)
});

// Deserialize user from the session
passport.deserializeUser((email, done) => {
  db.query('SELECT * FROM user_verification_table WHERE email = ?', [email], (err, results) => {
    if (err) return done(err);
    done(null, results[0]);
    console.log("User is", results[0]);
  });
});

const generateToken = (user) => {
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

// Export functions to handle routes
module.exports = {
  authenticate: passport.authenticate('google', { scope: ['profile', 'email'] }),
  
  callback: (req, res, next) => {
    passport.authenticate('google', { failureRedirect: '/login' }, (err, user) => {
      if (err) {
        console.error('Error during authentication:', err);
        return next(err);
      }
      if (!user) {
        return res.redirect('/login');
      }
      req.logIn(user, (loginErr) => {
        if (loginErr) {
          console.error('Login error:', loginErr);
          return next(loginErr);
        }

        console.log("Authenticated user:", user);

        // Generate JWT token
        const token = generateToken(user);

        // Determine the next action and handle accordingly
        if (user.next_action === 'mobile_verify') {
          // Redirect to OTP verification page with token in query params
          return res.redirect(`http://localhost:3000/verify-otp?token=${user.verification_hash}`);
        }

        if (user.next_action === null) {
          // Send JWT token to the frontend in the response
          res.cookie('authToken', token, {
            secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
            maxAge: 3600000, // 1 hour
          });
  
          // Redirect to the frontend dashboard (or another page)
          res.redirect(`http://localhost:3000/dashboard?token=${user.verification_hash}`);
        } else {
          return res.redirect('/login');
        }
      });
    })(req, res, next);
  },

  dashboard: (req, res) => {
    if (req.isAuthenticated()) {
      res.send(`Welcome ${req.user.username}!`);
    } else {
      res.redirect('/');
    }
  }
};
