import { Db, ObjectId } from "mongodb";
import fetch from "node-fetch";
import { find, cloneDeep, isEqual } from "lodash";

const installApp = async (db, key: string) =>
  new Promise<void>((resolve, reject) => {
    // Announce
    const logPrefix = `(Installing ${key})`;
    console.log(`${logPrefix} Install started`);

    fetch(`https://frontbase.vtvc.nl/api/frontbase-apps/read?key=${key}`).then(
      async (response) => {
        // Success
        //@ts-ignore
        const remoteApp: { install_script: any; models: any; objects: any } =
          await response.json();

        const installScript = JSON.parse(remoteApp.install_script);

        await installScript.reduce(async (prev, step) => {
          await prev;

          switch (step.command) {
            case "models":
              await updateModels(JSON.parse(remoteApp.models), db, logPrefix);
              break;
            case "objects":
              await updateObjects(JSON.parse(remoteApp.objects), db, logPrefix);
              break;
            default:
              console.log(`${logPrefix} Unknown command ${step.command}`);
              break;
          }

          return step;
        }, installScript[0]);

        resolve();
      },
      (error) => {
        // Something went wrong!
        console.log(`${logPrefix} Couldn't fetch app script for ${key}`, error);
        reject();
      }
    );
  });

export default installApp;

// This is relatively easy because on a fresh install we only have to insert models
const updateModels = (models, db: Db, logPrefix: string) =>
  new Promise<void>(async (resolve, reject) => {
    await db.collection("models").insertMany(
      models.map((model) => {
        return { ...model, _id: new ObjectId(model._id.$oid) };
      })
    );
    resolve();
  });

const updateObjects = (objects, db: Db, logPrefix: string) =>
  new Promise<void>(async (resolve, reject) => {
    await db.collection("objects").insertMany(
      objects.map((object) => {
        return { ...object, _id: new ObjectId(object._id.$oid) };
      })
    );
    resolve();
  });
