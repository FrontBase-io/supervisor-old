import { MongoClient } from "mongodb";

// Main supervisor module
// Stays online and watches for system-tasks to appear.

async function main() {
  const uri =
    "mongodb://root:ceYbc6VDwf2K3p38Y648Tm6PuDJVaBvL@192.168.0.2:29019/FrontBase?authSource=admin&replicaSet=replicaset&readPreference=primaryPreferred&directConnection=true&ssl=false&appname=Frontbase%20Supervisor";
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
