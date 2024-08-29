const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/dbConnection'); 

const app = express();

app.use(session({
  secret: 'your-secret-key', 
  resave: false,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: 'http://localhost:8000/api/auth/google/callback'
},
async (accessToken, refreshToken, profile, done) => {
  try {
    console.log('Google profile:', profile);

    const email = profile.emails[0].value;
    const username = profile.displayName;
    const googleId = profile.id;
    const imageUrl = profile.photos[0]?.value;

    const verificationHash = crypto.randomBytes(16).toString('hex');

    db.query('SELECT * FROM user_verification_table WHERE email = ?', [email], (err, verificationResults) => {
      if (err) return done(err);

      let isNewUser = verificationResults.length === 0;

      if (isNewUser) {
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

      db.query('SELECT * FROM user_table WHERE email = ?', [email], (err, userResults) => {
        if (err) return done(err);

        if (userResults.length === 0) {
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
          db.query(`
            UPDATE user_table
            SET username = ?, google_id = ?, is_social_signup = ?
            WHERE email = ?`,
            [username, googleId, true, email],
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

passport.serializeUser((user, done) => {
  done(null, user.email); 
});

passport.deserializeUser((email, done) => {
  db.query('SELECT * FROM user_verification_table WHERE email = ?', [email], (err, results) => {
    if (err) return done(err);
    done(null, results[0]);
    console.log("User is", results[0]);
  });
});

const generateToken = (user) => {
  // Fetch the role from the user_verification_table
  return new Promise((resolve, reject) => {
    db.query('SELECT role FROM user_verification_table WHERE email = ?', [user.email], (err, roleResult) => {
      if (err) return reject(err);
      if (!roleResult.length) return reject(new Error('Role not found'));
      
      const userRole = roleResult[0].role;
      const token = jwt.sign(
        { id: user.id, email: user.email, role: userRole },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      resolve(token);
    });
  });
};

module.exports = {
  authenticate: passport.authenticate('google', { scope: ['profile', 'email'] }),

  callback: (req, res, next) => {
    passport.authenticate('google', { failureRedirect: '/login' }, async (err, user) => {
      if (err) {
        console.error('Error during authentication:', err);
        return next(err);
      }
      if (!user) {
        return res.redirect('/login');
      }
      req.logIn(user, async (loginErr) => {
        if (loginErr) {
          console.error('Login error:', loginErr);
          return next(loginErr);
        }

        console.log("Authenticated user:", user);
        try {
          const token = await generateToken(user);

          if (user.next_action === 'mobile_verify') {
            return res.redirect(`http://localhost:3000/verify-otp?token=${user.verification_hash}`);
          }

          if (user.next_action === null) {
            res.cookie('authToken', token, {
              secure: process.env.NODE_ENV === 'production',
              httpOnly: true, // Ensure the cookie is only accessible via HTTP(S)
              maxAge: 3600000, // 1 hour
            });

            res.redirect(`http://localhost:3000/dashboard?token=${user.verification_hash}`);
          } else {
            return res.redirect('/login');
          }
        } catch (error) {
          console.error('Error generating token:', error);
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
