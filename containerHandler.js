require("dotenv").config();
const { BlobServiceClient } = require("@azure/storage-blob");
const {
  AzureNamedKeyCredential,
  TableClient,
  odata,
} = require("@azure/data-tables");
const axios = require("axios");

const getBlobs = async (containerName, id) => {
  const blobServiceClient = BlobServiceClient.fromConnectionString(
    process.env.BLOB_CONNECTION_STRING
  );

  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blobClient = containerClient.getBlobClient(id);
  const downloadBlockBlobResponse = await blobClient.download();
  return downloadBlockBlobResponse;
};

const uploadToTable = async (entityArray, tableName) => {
  const tableClient = createTableClient(tableName);
  for (const entity of entityArray) {
    await tableClient.upsertEntity(entity);
  }
};

const getTables = async (tableName, queryOptions) => {
  const tableClient = createTableClient(tableName);
  const options = queryOptions
    ? {
        queryOptions: queryOptions,
      }
    : undefined;
  const entities = [];
  for await (const entity of tableClient.listEntities(options)) {
    entities.push(entity);
  }
  return Promise.all(entities);
};

const createTableClient = (tableName) => {
  const tableClient = new TableClient(
    `https://${process.env.STORAGE_ACCOUNT}.table.core.windows.net`,
    tableName,
    new AzureNamedKeyCredential(
      process.env.STORAGE_ACCOUNT,
      process.env.STORAGE_KEY
    )
  );
  return tableClient;
};

module.exports = { getTables, getBlobs, uploadToTable };
