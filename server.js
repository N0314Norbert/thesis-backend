require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
const { getTables, getBlobs } = require("./containerHandler");
const { odata } = require("@azure/data-tables");

app.use(express.json());
app.use(cors());
app.use(bodyParser.json());

const port = process.env.PORT || 3000;

app.get("/fetchglb", async (req, res) => {
  const blobId = req.query.blobId;
  try {
    const blob = await getBlobs(process.env.GLB_CONTAINER_NAME, blobId);

    res.setHeader("Content-Disposition", `attachment; filename=${blobId}`);
    res.setHeader("Content-Type", blob.contentType);
    blob.readableStreamBody.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

/*function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}*/

app.get("/productdata", async (req, res) => {
  const id = req.query.id;
  const queryOptions = id ? { filter: odata`RowKey eq '${id}'` } : undefined;
  try {
    const products = await getTables(queryOptions);
    res.status(200).json(products);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/productcount", async (req, res) => {
  try {
    const products = await getTables();
    res.status(200).json({ count: products.length });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/productvector", async (req, res) => {
  const { min, max } = req.query;
  const queryOptions = { filter: odata`RowKey ge ${min} and RowKey le ${max}` };
  try {
    const products = await getTables(queryOptions);
    res.status(200).json(products);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/productimage", async (req, res) => {
  const id = req.query.id;
  if (!id) {
    res.status(400).send("missing parameter");
  }
  try {
    const blob = await getBlobs(process.env.IMAGE_CONTAINER_NAME, id);

    res.setHeader("Content-Disposition", `attachment; filename=${id}`);
    res.setHeader("Content-Type", blob.contentType);
    blob.readableStreamBody.pipe(res);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port);
