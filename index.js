//Importamos librerias
import express from "express";
import bodyParser from "body-parser";
import db from "./db.js";

db.connect();
const app = express();
const port = 3000;

//Middlewares
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

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

//POST request
app.post("/register", async (req, res) => {
  try {
    const { username } = req.body;
    const { password } = req.body;
    const checkEmail = await db.query("SELECT * FROM users WHERE email = $1", [username]);
    if (checkEmail.rows.length > 0) {
      res.send("This email has been already used. Try to logging in");
    } else {

      await db.query(`INSERT INTO users (email, password) VALUES($1, $2)`, [username, password]);
      res.render('secrets.ejs');

    }
  } catch (error) {
    console.log(error);
  }
});

app.post("/login", async (req, res) => {
  const { username } = req.body;
  const { password } = req.body;
  const checkEmail = await db.query("SELECT * FROM users WHERE email = $1", [username]);
  //Revisamos si el usuario esta logeado
  if(checkEmail.rows.length > 0) {
    //Revisamos si la contraseña es correcta
      checkEmail.rows[0].password === password ? res.render("secrets.ejs") : res.send("Incorrect Password");
  } else {
    //Si no esta loggeado le mandamos un mensaje
    res.send("Email not registered yet. Register Now!");
  }

});

//Listening Server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
