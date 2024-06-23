//Importamos librerias
import express from "express";
import bodyParser from "body-parser";
import db from "./db.js";
import bcrypt from 'bcrypt';
import session from "express-session";
import passport from "passport";
import { Strategy } from "passport-local";

db.connect();
const app = express();
const port = 3000;
const saltRounds = 12;

//Middlewares
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(session({
  secret: "TOPSECRETWORD",
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 1000 * 60 * 60* 24
  }
}))

app.use(passport.initialize())
app.use(passport.session());


//HTTP request 
//Get request
app.get("/", (req, res) => {
  res.render("home.ejs");
});

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.get("/register", (req, res) => {
  res.render("register.ejs");
});

app.get("/secrets", (req, res) => {
  console.log(req.user.id);
  if (req.isAuthenticated()) {
    res.render("secrets.ejs")
  } else {
    res.redirect("/login");
  }
})

app.post("/login", passport.authenticate("local", {
  successRedirect: "/secrets",
  failureRedirect: "/login"
}));

//POST request
app.post("/register", async (req, res) => {
  try {
    //Tomamos los datos del usuario
    const { username } = req.body;
    const { password } = req.body;
    //Hacemos peticion para verificar si el usuario existe
    const checkEmail = await db.query("SELECT * FROM users WHERE email = $1", [username]);
    //revisamos si el usuario existe
    if (checkEmail.rows.length > 0) {
      res.send("This email has been already used. Try to logging in");
    } else {
      //Si el usuario no existe lo registramos en la base de datos y lo enviamos a la pagina principal
      //Hash password
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.log("Hash Error: ", err);
        } else {
          const result = await db.query(`INSERT INTO users (email, password) VALUES($1, $2) RETURNING *`, [username, hash]);
          const user = result.rows[0];
          req.login(user, (err) => {
            console.log(err);
            res.redirect("/secrets");
          })
        }
      })
    }
  } catch (error) {
    console.log(error);
  }
});


passport.use(new Strategy(async function verify(username, password, cb) {
  try {
    const result = await db.query("SELECT * FROM users WHERE email = $1", [username]);
    const user = result.rows[0]
    const dbPassword = user.password;
    //Revisamos si el usuario esta logeado
    if (result.rows.length > 0) {
      //Revisamos si la contraseña es correcta mediante bcrypt
      bcrypt.compare(password, dbPassword, (err, password) => {
        if (err) {
          return cb(err)
        } else {
          if (password) {
            return cb(null, user)
          } else {
            return cb(null, false)
          }
        }
      })
    } else {
      //Si no esta loggeado le mandamos un mensaje
      return cb("User not found");
    }
  } catch (error) {
    return cb(error);
  }
}));

passport.serializeUser((user, cb) => {
  cb(null, user);
})

passport.deserializeUser((user, cb) => {
  cb(null, user);
})

//Listening Server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
