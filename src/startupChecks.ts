import { MongoClient } from "mongodb";
import installApp from "./actions/apps/install";
const express = require("express");
const path = require("path");

// This file performs a database check
// If everything is in order it will start the actual supervisor
// If anything is wrong it will spin up a mini server showing we're still initialising.

async function main() {
  console.log("(init) Checking database state...");

  // we'll add code here soon
  const uri =
    "mongodb://root:ceYbc6VDwf2K3p38Y648Tm6PuDJVaBvL@192.168.0.2:29019/FrontBase?authSource=admin&replicaSet=replicaset&readPreference=primaryPreferred&directConnection=true&ssl=false&appname=Frontbase%20Server";
  const client: MongoClient = new MongoClient(uri, {
    //@ts-ignore
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  try {
    await client.connect();
    const databasesList = await client.db().admin().listDatabases();
    let db;
    //@ts-ignore
    databasesList.databases.forEach((_db) => {
      if (_db.name === "FrontBase") db = _db;
    });

    if (db) {
      console.log("(init) Checks passed.");
      process.exit(0);
    } else {
      // Socket on uninitialised state
      console.log(
        "(init) Database is uninitialised.. Serving loading page and performing initialisation."
      );
      let app = express();
      const port = 8600;
      app.get(
        "/",
        express.static(
          path.join(__dirname, "..", "static", "pages", "uninitialised")
        )
      );

      let server = app.listen(port, () => {
        console.log(
          `Preview FrontBase during set-up at http://localhost:${port}`
        );
      });

      // Install system dependencies
      installApp(client.db("FrontBase"), "system").then(
        () => {
          // Success
          // Close express server
          server.close();

          // Exit process succesfully (automatically starts up actual supervisor)
          process.exit(0);
        },
        () => {
          // Failure
          // Close express server
          server.close();
          let app = express();
          const port = 8600;
          app.get(
            "/",
            express.static(
              path.join(
                __dirname,
                "..",
                "static",
                "pages",
                "error_initialising"
              )
            )
          );

          server = app.listen(port, () => {
            console.log(
              `Preview FrontBase during set-up at http://localhost:${port}`
            );
          });
        }
      );
    }
  } catch (e) {
    // Socket on db error state
    console.error("Error state", e);
  }
}
main();
