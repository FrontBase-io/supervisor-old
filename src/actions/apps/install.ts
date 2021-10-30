import fetch from "node-fetch";
import { ColorType } from "../../Utils/Types";
var fs = require("fs");

interface AppManifestType {
  name: string;
  versions: { key: number; version: string; notes: string }[];
  script: ScriptStepType[];
}
interface ScriptStepType {
  command: string;
  data?: string;
  key?: string;
  meta?: {
    name?: string;
    color?: ColorType;
  };
}

const installApp = async (db, key: string) =>
  new Promise<void>((resolve, reject) => {
    // Announce
    const logPrefix = `(installing ${key})`;
    console.log(`${logPrefix} Install started`);

    fetch(`https://store.frontbase.io/manifests/${key}.json`).then(
      async (response) => {
        // Success
        const appManifest: AppManifestType = await response.json();

        // Save the install script to the /apps folder
        const appFolder = `/opt/frontbase/system/apps/${key}`;
        if (!fs.existsSync(appFolder)) {
          fs.mkdirSync(appFolder);
        }
        fs.writeFile(
          `${appFolder}/manifest.json`,
          JSON.stringify(appManifest),
          (data, err) => {
            if (err) console.log(err);
            console.log(`${logPrefix} Saved manifest file`);
          }
        );

        // Execute the script
        await appManifest.script.reduce(
          // @ts-ignore
          async (prev, curr) => {
            await performInstallScriptStep(curr, key, db);
            return curr;
          },
          appManifest.script[0]
        );

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

const performInstallScriptStep = (step: ScriptStepType, key: string, db) =>
  new Promise<void>((resolve, reject) => {
    const logPrefix = `(installing ${key})`;

    switch (step.command) {
      case "models":
        installModels(step, key, db).then(resolve, reject);
        break;
      case "objects":
        installObjects(step, key, db).then(resolve, reject);
        break;
      case "client":
        installClient(step, key, db).then(resolve, reject);
        break;
      default:
        console.log(`${logPrefix} Unknown command ${step.command}`);
        reject();
        break;
    }
  });

const installModels = (step: ScriptStepType, key: string, db) =>
  new Promise<void>((resolve, reject) => {
    // Installs the models based on the manifest on the store.
    // Installing is relatively easy and only requires a check if a model already exists.
    if (step.data) {
      // Fetch the models from the repository
      const repoUrl = `https://store.frontbase.io/manifests/${key}-${step.data}.json`;
      const logPrefix = `(installing ${key})`;
      console.log(`${logPrefix} Fetching models from repository ${repoUrl}`);

      fetch(repoUrl).then(
        async (response) => {
          const models = await response.json();

          // Save models to local cache
          fs.writeFile(
            `/opt/frontbase/system/apps/${key}/${step.data}.json`,
            JSON.stringify(models),
            (data, err) => {
              if (err) console.log(err);
              console.log(`${logPrefix} Saved models file`);
            }
          );

          // Loop through models
          await models.reduce(async (prev, curr) => {
            const model = await curr;
            if (await db.collection("models").findOne({ key: model.key })) {
              console.log(
                `${logPrefix} Error: model ${model.label_plural} (${model.key}) already exists!`
              );
              reject;
            } else {
              await db.collection("models").insertOne(model);
              console.log(
                `${logPrefix} Model ${model.label_plural} (${model.key}) created`
              );
            }
            return true;
          }, models[0]);

          resolve();
        },
        (error) => {
          // Something went wrong!
          console.log(`Couldn't fetch app models`, error);
          reject();
        }
      );
    } else {
      console.log("Data is missing from install script step");
      reject();
    }
  });

const installObjects = (step: ScriptStepType, key: string, db) =>
  new Promise<void>((resolve, reject) => {
    // Installs the objects based on the manifest on the store.
    // Installing is relatively easy and only requires a check if an object already exists.
    if (step.data) {
      // Fetch the models from the repository
      const repoUrl = `https://store.frontbase.io/manifests/${key}-${step.data}.json`;
      const logPrefix = `(installing ${key})`;
      console.log(`${logPrefix} Fetching objects from repository ${repoUrl}`);

      fetch(repoUrl).then(
        async (response) => {
          const objects = await response.json();

          // Save models to local cache
          fs.writeFile(
            `/opt/frontbase/system/apps/${key}/${step.data}.json`,
            JSON.stringify(objects),
            (data, err) => {
              if (err) console.log(err);
              console.log(`${logPrefix} Saved objects file`);
            }
          );

          // Loop through objects
          await objects.reduce(async (prev, curr) => {
            const object = await curr;
            //await db.collection("objects").findOne({ _id: model.key })
            let alreadyExists = false;
            if (object._id) {
              if (await db.collection("objects").findOne({ _id: object._id }))
                alreadyExists = true;
            }
            if (alreadyExists) {
              console.log(
                `${logPrefix} Error: object ${object._id} already exists!`
              );
              reject();
            } else {
              await db.collection("objects").insertOne(object);
            }
            return true;
          }, objects[0]);

          resolve();
        },
        (error) => {
          // Something went wrong!
          console.log(`Couldn't fetch app objects`, error);
          reject();
        }
      );
    } else {
      console.log("Data is missing from install script step");
      reject();
    }
  });

const installClient = (step: ScriptStepType, key: string, db) =>
  new Promise<void>(async (resolve, reject) => {
    // Installs the objects based on the manifest on the store.
    // Installing is relatively easy and only requires a check if an object already exists.
    if (step.key && step.meta) {
      // Fetch the models from the repository
      const logPrefix = `(installing ${key})`;
      console.log(`${logPrefix} Installing client ${step.meta.name}`);

      // Check if app already exists
      const appExists = await db
        .collection("objects")
        .findOne({ "meta.model": "app", key: step.key });
      if (!appExists) {
        await db.collection("objects").insertOne({
          meta: { model: "app" },
          name: step.meta.name,
          key: step.key,
          color: step.meta.color,
        });
        console.log();
        console.log(
          `${logPrefix} The app ${step.meta.name} has been installed.`
        );
        resolve();
      } else {
        console.log(
          `${logPrefix} The app ${step.meta.name} seems to already be installed`
        );
      }
    } else {
      console.log("Data is missing from install script step");
      reject();
    }
  });
