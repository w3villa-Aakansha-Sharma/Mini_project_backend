const GoogleStrategy = require('passport-google-oauth20').Strategy;
const passport = require('passport');
const express = require("express");
const session = require("express-session");
const jwt = require("jsonwebtoken");
const queries = require('../helper/queries'); // Ensure the correct path to queries.js

const app = express();
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

// Configure Google Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: 'http://localhost:8000/api/auth/google/callback'
},
async (accessToken, refreshToken, profile, done) => {
  try {
    console.log('Google profile:', profile);

    // Check if user exists in the database
    let user = await queries.getUserByEmail(profile.emails[0].value);
    if (!user) {
      // User does not exist, insert new user
      const newUser = {
        username: profile.displayName,
        email: profile.emails[0].value,
        google_id: profile.id,
        next_action: 'mobile_verify'
      };
      console.log('Inserting new user:', newUser);
      await queries.insertUser(newUser);
      console.log('User inserted into the database:', newUser);
      user = newUser;
    } else {
      // User exists, update existing user
      const updatedUser = {
        username: profile.displayName,
        google_id: profile.id,
        next_action: 'mobile_verify'
      };
      console.log('Updating existing user:', updatedUser);
      await queries.updateUserByEmail(profile.emails[0].value, updatedUser);
      console.log('User updated in the database:', updatedUser);
      user = { ...user, ...updatedUser };
    }
    return done(null, user);
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
passport.deserializeUser(async (email, done) => {
  try {
    const user = await queries.getUserByEmail(email);
    done(null, user);
  } catch (err) {
    console.error('Error during deserialization:', err);
    done(err);
  }
});

const generateToken = (user) => {
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

// Export functions to handle routes
module.exports = {
  authenticate: passport.authenticate('google', { scope: ['profile', 'email'] }),
  callback: (req, res, next) => {
    passport.authenticate('google', { failureRedirect: '/login' }, (err, user, info) => {
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
        if (user.next_action === 'mobile_verify') {
          res.redirect(`http://localhost:3000/verify-otp?token=${user.verification_hash}`);
        } else {
          const token = generateToken(user);
          res.json({ token });
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
