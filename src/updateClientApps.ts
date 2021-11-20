import { MongoClient } from "mongodb";
require("dotenv").config();
const shell = require("shelljs");

// This file adds the last versions of all client apps to the client.

async function main() {
  console.log("(action) Updating client apps");

  const uri = "mongodb://" + process.env.DBURL + "&appname=Frontbase%20Server";
  const client: MongoClient = new MongoClient(uri, {
    //@ts-ignore
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  await client.connect();
  const db = client.db("FrontBase");

  const installedApps = await db
    .collection("systemsettings")
    .findOne({ key: "installed-apps" });
  await (installedApps?.value || []).reduce(async (prev, curr) => {
    await prev;
    console.log(`---> Updating ${curr}...`);

    await shell.exec(
      `yarn --cwd ../client add @frontbase/${curr}-client@latest`
    );

    return curr;
  }, (installedApps?.value || [])[0]);
  process.exit();
}
main();
