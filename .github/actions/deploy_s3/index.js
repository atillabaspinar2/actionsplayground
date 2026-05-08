// index.js for deploy_s3 action
const core = require("@actions/core");
const github = require("@actions/github");
const exec = require("@actions/exec");

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const fs = require("fs");
const path = require("path");

async function run() {
  try {
    // Get inputs from action
    const bucketName = core.getInput("bucket_name", { required: true });
    const filePath = core.getInput("file_path", { required: true });
    const awsAccessKeyId = core.getInput("aws_access_key_id", {
      required: true,
    });
    const awsSecretAccessKey = core.getInput("aws_secret_access_key", {
      required: true,
    });
    const region = core.getInput("region", { required: true });

    // Create S3 client
    const s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId: awsAccessKeyId,
        secretAccessKey: awsSecretAccessKey,
      },
    });

    // Read file content
    const fileContent = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);

    // Upload file to S3
    const uploadParams = {
      Bucket: bucketName,
      Key: fileName,
      Body: fileContent,
    };

    await s3Client.send(new PutObjectCommand(uploadParams));
    core.info(`File ${fileName} uploaded successfully to bucket ${bucketName}`);
  } catch (error) {
    core.setFailed(`Action failed with error: ${error.message}`);
  }
}

run();
