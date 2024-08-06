// const GoogleStrategy = require("passport-google-oauth2").Strategy;
// const passport = require("passport");

// passport.use(new GoogleStrategy({
//     clientID:process.env.CLIENT_ID,
//     clientSecret:process.env.CLIENT_SECRET,
//     callbackURL: "http://localhost:8000/api/auth/google/callback",
//     scope:["profile","email"]
//   },
//   function(accessToken, refreshToken, profile, callback) {
//    callback(null,profile);
//   }
// )
// );
// passport.serializeUser((user,done)=>{
//     done(null,user);
// });
// passport.deserializeUser((user,done)=>{
//     done(null,user);
// });