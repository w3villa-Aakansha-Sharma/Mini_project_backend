const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;


require('dotenv').config()

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL:'http://localhost:8000/api/auth/callback/google',
    passReqToCallback:true
  },
  async function(request,accessToken,refreshToken,profile,done){
    console.log("profile::::::::::::", profile)
    try {

        return done(null, profile);
      } catch (error) {
        console.error("Error in user profile creation:", error);
        return done(error, null);
      }
  
  }
));


  

  
passport.serializeUser((profile, done) => {
    console.log("user:::::::::" ,profile)
    done(null, profile.id);
  });

passport.deserializeUser(async (id, done) => {
    try {

      done(null, profile);
    } catch (error) {
      done(error, null);
    }
  });
  
  module.exports = passport;