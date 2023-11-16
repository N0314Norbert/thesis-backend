require("dotenv").config();
const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const cors = require("cors");
const bodyParser = require("body-parser");
const axios = require("axios");
const querystring = require("querystring");
const msal = require("@azure/msal-node");

app.use(express.json());
app.use(cors());
app.use(bodyParser.json());

const port = process.env.PORT || 3000;

app.post("/register-user", async (req, res) => {
  const { username, password, displayName, email } = req.body;
  const tokenEndpoint = `https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/v2.0/token`;
  const graphApiEndpoint = "https://graph.microsoft.com/v1.0/users";
  const body_json = {
    grant_type: "client_credentials",
    client_id: process.env.APP_ID,
    client_secret: process.env.CLIENT_SECRET,
    scope: "https://graph.microsoft.com/.default",
  };
  try {
    const tokenResponse = await axios.post(
      tokenEndpoint,
      querystring.stringify(body_json)
    );

    const accessToken = tokenResponse.data.access_token;
    const userCreationResponse = await axios.post(
      graphApiEndpoint,
      {
        accountEnabled: true,
        userPrincipalName: username + "@nagynorbert314gmail.onmicrosoft.com",
        passwordProfile: {
          forceChangePasswordNextSignIn: false,
          password: password,
        },
        userType: "Guest",
        displayName: email,
        mailnickname: username,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    const addMemberEndpoint = `https://graph.microsoft.com/v1.0/groups/${process.env.GROUP_ID}/members/$ref`;
    await axios.post(
      addMemberEndpoint,
      {
        "@odata.id": `https://graph.microsoft.com/v1.0/users/${userCreationResponse.data.id}`,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    res.status(200).json({ success: true, data: userCreationResponse.data });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

const config = {
  auth: {
    clientId: process.env.APP_ID,
    authority: `https://login.microsoftonline.com/${process.env.TENANT_ID}`,
    clientSecret: process.env.CLIENT_SECRET,
  },
};

const cca = new msal.ConfidentialClientApplication(config);

app.post("/login", async (req, res) => {
  const username = req.body.email;
  const password = req.body.password;

  const tokenRequest = {
    scopes: ["openid", "profile", "user.read"],
    username: username,
    password: password,
  };

  try {
    const result = await cca.acquireTokenByUsernamePassword(tokenRequest);

    if (result.status) {
      const accessToken = generateAccessToken(username);
      const refreshToken = jwt.sign(username, process.env.REFRESH_TOKEN_SECRET);
      //refreshTokens.push(refreshToken);
      res
        .status(200)
        .json({ accessToken: accessToken, refreshToken: refreshToken, result });
    } else {
      res.status(401).send("Unauthenticated");
    }
  } catch (error) {
    res.status(500).send(error.message);
  }
});

function generateAccessToken(user) {
  return jwt.sign({ name: user }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "15m",
  });
}
app.delete("/logout", (req, res) => {
  res.sendStatus(204);
});
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

app.post("/token", (req, res) => {
  const refreshToken = req.body.token;
  if (refreshToken == null) return res.sendStatus(401);
  //if (!refreshTokens.includes(refreshToken)) return res.sendStatus(403);
  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    const accessToken = generateAccessToken({ name: user.name });
    res.json({ accessToken: accessToken });
  });
});

app.listen(port);
