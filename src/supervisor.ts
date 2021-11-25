import { MongoClient } from "mongodb";
import InstallApp from "./SystemTasks/install-app";
import SystemUpdate from "./SystemTasks/system-update";
import { SystemTaskObjectType } from "./Utils/Types";
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
    await client.connect();
    const db = client.db("FrontBase");
    db.collection("objects")
      .watch([], {
        fullDocument: "updateLookup",
      })
      .on("change", (change) => {
        if (change.operationType === "insert") {
          const document = change.fullDocument as SystemTaskObjectType;
          const updateTask = (task, fieldsToUpdate: { [key: string]: any }) =>
            new Promise<SystemTaskObjectType>((resolve) => {
              db.collection("objects")
                .updateOne(
                  { _id: document._id },
                  { $set: { ...fieldsToUpdate } }
                )
                .then(() =>
                  resolve({
                    ...task,
                    ...fieldsToUpdate,
                  })
                );
            });
          if (document.meta.model === "system-task") {
            switch (document.type) {
              case "system-update":
                SystemUpdate(document, updateTask);
                break;
              case "install-app":
                InstallApp(document, updateTask, db);
                break;
              default:
                console.log(`Unknown task type: ${document.type}`);

                break;
            }
          }
        }
      });
  } catch (e) {
    console.error("Error state", e);
  }
}
main();
