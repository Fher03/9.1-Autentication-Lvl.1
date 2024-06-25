//Importamos librerias
import express from "express";
import bodyParser from "body-parser";
import db from "./db.js";
import bcrypt from 'bcrypt';
import session from "express-session";
import passport from "passport";
import { Strategy } from "passport-local";
import env from "dotenv";
import { Strategy as GoogleStrategy } from 'passport-google-oauth2'

db.connect();
const app = express();
const port = 3000;
const saltRounds = process.env.SALT_ROUNDS;
env.config();

//Middlewares
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));


//Valores de sesion 
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24
  }
}))


//inicializando passport
app.use(passport.initialize())
app.use(passport.session());


//HTTP request 
//Get request
app.get("/", (req, res) => {
  res.render("home.ejs");
});

//Manejamos rutas de google
app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

app.get(
  "/auth/google/secrets",
  passport.authenticate("google", {
    successRedirect: "/secrets",
    failureRedirect: "/login",
  })
);

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.get("/register", (req, res) => {
  res.render("register.ejs");
});

//Revisamos si esta autenticado para entrar a la plataforma
app.get("/secrets", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("secrets.ejs")
  } else {
    res.redirect("/login");
  }
})



//Cerrramos sesion y enviamos al login
app.get("/logout", (req, res) => {
  req.logout((err) => {
    console.log(err)
  })
  res.render("login.ejs");
})


//POST request
//Manejo de redireccion exitosa y fallida y estrategia local
app.post("/login", passport.authenticate("local", {
  successRedirect: "/secrets",
  failureRedirect: "/login"
}));

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

//Definimos nuestra Estrategia Local
passport.use("local", new Strategy(async function verify(username, password, cb) {
  try {
    const result = await db.query("SELECT * FROM users WHERE email = $1", [username]);
    const user = result.rows[0]
    //Revisamos si el usuario esta logeado
    if (result.rows.length > 0) {
      //Revisamos si la contraseña es correcta mediante bcrypt
      bcrypt.compare(password, user.password, (err, password) => {
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

//Estrategia de Google
passport.use("google", new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${process.env.APP_URL}/auth/google/secrets`,
}, async (accessToken, refreshToken, profile, cb) => {
  try {
    const result = await db.query("SELECT * FROM users WHERE email = $1", [profile.email]);
    if (result.rows.length === 0) {
      const newUser = await db.query("INSERT INTO users (email, password) VALUES($1, $2)", [profile.email, "google"]);
      return cb(null, newUser.rows[0])
    } else {
      return cb(null, result.rows[0])
    }
  } catch (error) {
    console.log(error);
  }
}))

//Serialize and deserialize User 
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
