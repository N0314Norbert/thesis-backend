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
const getTables = async (queryOptions) => {
  const tableName = process.env.TABLE_NAME;
  const tableClient = new TableClient(
    `https://${process.env.STORAGE_ACCOUNT}.table.core.windows.net`,
    tableName,
    new AzureNamedKeyCredential(
      process.env.STORAGE_ACCOUNT,
      process.env.STORAGE_KEY
    )
  );
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

module.exports = { getTables, getBlobs };
