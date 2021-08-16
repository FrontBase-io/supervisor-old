import { MongoClient } from "mongodb";
require("dotenv").config();

// Main supervisor module
// Stays online and watches for system-tasks to appear.

async function main() {
  const uri =
    "mongodb://" + process.env.DBURL + "&appname=Frontbase%20Supervisor";
  const client: MongoClient = new MongoClient(uri, {
    //@ts-ignore
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  try {
    await client.connect();
    console.log("Supervisor is running succesfully!");
  } catch (e) {
    console.error("Error state", e);
  }
}
main();
