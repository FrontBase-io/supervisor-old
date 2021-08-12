import fetch from "node-fetch";
var fs = require("fs");

interface AppManifestType {
  name: string;
  versions: { key: number; version: string; notes: string }[];
  script: ScriptStepType[];
}
interface ScriptStepType {
  command: string;
  data?: string;
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
          async (curr, prev) => {
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
