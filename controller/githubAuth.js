const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/dbConnection'); // Make sure to replace with your actual database connection file

const app = express();

// Session configuration
app.use(session({
  secret: 'aakansha-sharma', // Replace with your own secret
  resave: false,
  saveUninitialized: true,
}));

// Initialize Passport and restore authentication state, if any, from the session
app.use(passport.initialize());
app.use(passport.session());

function cleanUrl(url) {
    // Decode the URL to handle encoded characters
    const decodedUrl = decodeURIComponent(url);
    // Remove the specific encoded string
    const cleanedUrl = decodedUrl.replace('}', ''); // Replace '}' with an empty string
    return cleanedUrl;
  }

// Configure the GitHub strategy
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: 'http://localhost:8000/api/auth/github/callback',
  scope: ['user:email'],
}, async (accessToken, refreshToken, profile, done) => {
  try {
    console.log('GitHub profile:', profile);

    const email = profile.emails[0].value;
    const username = profile.username;
    const githubId = profile.id;
    const imageUrl = profile.photos[0]?.value;
    const verificationHash = crypto.randomBytes(16).toString('hex');

    // Check if the user is already in the verification table
    db.query('SELECT * FROM user_verification_table WHERE email = ?', [email], (err, verificationResults) => {
      if (err) return done(err);

      const isNewUser = verificationResults.length === 0;
      console.log("isnewuser", isNewUser);
      console.log("verificationResult", verificationResults.length);

      if (isNewUser) {
        // Insert new user into verification table
        db.query(
          'INSERT INTO user_verification_table (unique_reference_id, email, verification_hash, user_data, is_email_verified, next_action) VALUES (?, ?, ?, ?, 1, ?)',
          [crypto.randomBytes(16).toString('hex'), email, verificationHash, JSON.stringify({ username, email }), 'mobile_verify'],
          (err) => {
            if (err) return done(err);
            console.log('User inserted into the verification table:', { username, email, verification_hash: verificationHash });
          }
        );

        // Insert new user into user table
        db.query(
          'INSERT INTO user_table (username, email, github_id, verification_hash) VALUES (?, ?, ?, ?)',
          [username, email, githubId, verificationHash],
          (err) => {
            if (err) return done(err);
            console.log('User inserted into the user table:', { username, email, github_id: githubId });
            return done(null, { username, email, verification_hash: verificationHash, next_action: 'mobile_verify' });
          }
        );
      } else {
        // Fetch unique_reference_id from the verification table
        const uniqueReferenceId = verificationResults[0].unique_reference_id;
        const verificationHashuser = verificationResults[0].verification_hash;

        // Check if the user is already in the user table
        db.query('SELECT * FROM user_table WHERE email = ?', [email], (err, userResults) => {
          if (err) return done(err);

          if (userResults.length === 0) {
            // Insert new user into user table with unique_reference_id
            db.query(
              'INSERT INTO user_table (username, email, github_id, verification_hash, unique_reference_id) VALUES (?, ?, ?, ?, ?)',
              [username, email, githubId, verificationHashuser, uniqueReferenceId],
              (err) => {
                if (err) return done(err);
                console.log('User inserted into the user table:', { username, email, github_id: githubId });
                return done(null, { username, email, verification_hash: verificationHashuser, next_action: 'mobile_verify' });
              }
            );
          } else {
            // Update existing user in user table
            db.query(
              'UPDATE user_table SET username = ?, github_id = ?, is_social_signup = ? WHERE email = ?',
              [username, githubId, true, email],
              (err) => {
                if (err) return done(err);
                console.log('User updated in the user table:', { username, email, github_id: githubId, image_url: imageUrl });
                return done(null, { ...userResults[0] });
              }
            );
          }
        });
      }
    });
  } catch (error) {
    console.error('Error during GitHub authentication:', error);
    return done(error);
  }
}));

// Serialize user into the sessions
passport.serializeUser((user, done) => {
  done(null, user.email);
});

// Deserialize user from the sessions
passport.deserializeUser((email, done) => {
  db.query('SELECT * FROM user_verification_table WHERE email = ?', [email], (err, results) => {
    if (err) return done(err);
    done(null, results[0]);
    console.log("User is", results[0]);
  });
});

// JWT generation function
const generateToken = (user) => {
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '24h' });
};

// Function to handle GitHub authentication initiation
const githubAuthenticate = passport.authenticate('github', { scope: ['user:email'] });

// Function to handle GitHub callback
const githubCallbackHandler = (req, res, next) => {
  passport.authenticate('github', { failureRedirect: '/login' }, (err, user) => {
    if (err) {
      console.error('Error during GitHub authentication:', err);
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

      console.log("Authenticated GitHub user:", user);
      const token = generateToken(user);
      console.log(user.verification_hash)

      if (user.next_action === 'mobile_verify') {
        // Redirect to mobile verification page
        return res.redirect(`http://localhost:3000/verify-otp?token=${user.verification_hash}`);
      }

      if (user.next_action === null) {
        // Set the JWT token as a cookie and redirect to the dashboard
        res.cookie('authToken', token, {
          secure: process.env.NODE_ENV === 'production',
          maxAge: 3600000, // 1 hour
        });

        res.redirect(`http://localhost:3000/dashboard?token=${user.verification_hash}`);
      } else {
        return res.redirect('/login');
      }
    });
  })(req, res, next);
};

// Export functions
module.exports = {
  githubAuthenticate,
  githubCallbackHandler,
};

// Sample usage in your routes file (e.g., route.js)
// const { githubAuthenticate, githubCallbackHandler } = require('./path/to/this/file');

// app.get('/auth/github', githubAuthenticate);
// app.get('/auth/github/callback', githubCallbackHandler);
