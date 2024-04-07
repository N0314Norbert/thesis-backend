require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const { getTables, getBlobs, uploadToTable } = require("./containerHandler");
const { odata } = require("@azure/data-tables");

app.use(express.json());
app.use(cors());
app.use(bodyParser.json());

const port = process.env.PORT || 3000;

function authenticate(req, res, next) {
  const bearerHeader = req.headers["authorization"];
  const token = bearerHeader && bearerHeader.split(" ")[1];
  if (token === null) return res.sendStatus(401);

  const public_key = `-----BEGIN PUBLIC KEY-----\n${process.env.KEYCLOAK_PUBLIC_KEY}\n-----END PUBLIC KEY-----`;

  jwt.verify(
    token,
    public_key,
    {
      algorithms: ["RS256"],
    },
    (err, user) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    }
  );
}

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

app.post("/uploadinvoice", authenticate, (req, res) => {
  try {
    uploadToTable(req.body, process.env.INVOICE_TABLE_NAME);
    res.status(200).send("Entities uploadeed successfully");
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/productdata", async (req, res) => {
  const id = req.query.id;
  const queryOptions = id ? { filter: odata`RowKey eq '${id}'` } : undefined;
  try {
    const products = await getTables(
      process.env.PRODUCT_TABLE_NAME,
      queryOptions
    );
    res.status(200).json(products);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/boughtproducts", authenticate, async (req, res) => {
  const id = req.query.id;
  try {
    if (!id) {
      throw new Error("id not provided");
    }
    const products = await getTables(process.env.INVOICE_TABLE_NAME, {
      filter: odata`user eq '${id}'`,
    });
    res.status(200).json(products);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/productcount", async (req, res) => {
  try {
    const products = await getTables(process.env.PRODUCT_TABLE_NAME);
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
    const products = await getTables(
      process.env.PRODUCT_TABLE_NAME,
      queryOptions
    );
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
