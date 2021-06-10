require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMonggose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const port = process.env.PORT || 6900;

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(session({
  secret: 'mysessionid',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));
app.use(passport.initialize());
app.use(passport.session());

const url = "mongodb+srv://dbUser:test@cluster0.ithat.mongodb.net/UserDB";
mongoose.connect(url, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const userSchema = mongoose.Schema({
  username: String,
  password: String,
  googleId: String,
  facebookId: String,
  twitterId: String
});
userSchema.plugin(passportLocalMonggose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);
passport.use(User.createStrategy());
passport.serializeUser(function (user, done) {
  done(null, user.id);
});
passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:6900/auth/google/secrets"
},
  function (accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/logout", (req, res) => {
  req.logOut();
  res.redirect("/");
});

app.get("/secrets", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("secrets");
  }
  else {
    res.redirect("/login");
  }
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/secrets',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function (req, res) {
    res.redirect('/secrets');
  });

app.post("/register", (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  User.register({ username: username }, password, function (err, user) {
    if (err) {
      console.log(err);
    }
    else {
      passport.authenticate('local')(req, res, () => {
        res.redirect('/secrets');
      });
    }
  });
});

app.post("/login", (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  const user = new User({
    username: username,
    password: password
  });
  req.logIn(user, (err) => {
    if (err) {
      console.log(err);
    }
    else {
      passport.authenticate('local')(req, res, () => {
        res.redirect('/secrets');
      });
    }
  });
});

app.listen(port, () => {
  console.log(`server is running on ${port}`);
});