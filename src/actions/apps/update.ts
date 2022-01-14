import { Db, ObjectId } from "mongodb";
import fetch from "node-fetch";
import { find, cloneDeep, isEqual } from "lodash";

const updateApp = async (db, key: string) =>
  new Promise<void>((resolve, reject) => {
    // Announce
    const logPrefix = `(Updating ${key})`;
    console.log(`${logPrefix} Update started`);

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

export default updateApp;

const updateModels = (models, db: Db, logPrefix: string) =>
  new Promise<void>(async (resolve, reject) => {
    const oldModels = await (await db.collection("models").find({})).toArray();

    console.log(`${logPrefix} Updating models...`);

    await models.reduce(async (prev, model) => {
      await prev;

      const oldModel = find(oldModels, (o) => o.key === model.key);
      if (oldModel) {
        const newModel = cloneDeep(oldModel);
        // Model already exists, update

        // Basic information
        newModel.key = model.key;
        newModel.key_plural = model.key_plural;
        newModel.label = model.label;
        newModel.label_plural = model.label_plural;
        newModel.icon = model.icon;
        newModel.app = model.app;
        newModel.primary = model.primary;

        // Fields
        //@ts-ignore
        await Object.keys(model.fields).reduce(async (prev, currField) => {
          await prev;

          if (!newModel.fields[currField]) {
            // Field doesn't currently exist. Add it
            console.log(
              `${logPrefix} Field ${currField} not found in model. Adding it`
            );
            newModel.fields[currField] = model.fields[currField];
          } else if (
            !isEqual(newModel.fields[currField], model.fields[currField])
          ) {
            // Fields are not the same.
            if (model.fields[currField].clashMethod !== "keepUser") {
              console.log(
                `${logPrefix} Field ${currField} has changed. Updating`
              );
              newModel.fields[currField] = model.fields[currField];
            }
          }

          return currField;
        }, Object.keys(model.fields)[0]);

        // Permissions
        // So far we don't do anything with permissions. Clash management strategy unknown

        // Layouts
        // The only thing we'll do is add lay-outs that don't exist.
        //@ts-ignore
        await Object.keys(model.layouts).reduce(async (prev, currLayout) => {
          if (!newModel.layouts[currLayout]) {
            newModel.layouts[currLayout] = model.layouts[currLayout];
          }
        }, Object.keys(model.layouts)[0]);

        // Lists
        // The only thing we'll do is add lay-outs that don't exist.
        //@ts-ignore
        await Object.keys(model.lists).reduce(async (prev, currLayout) => {
          if (!newModel.lists[currLayout]) {
            newModel.lists[currLayout] = model.lists[currLayout];
          }
        }, Object.keys(model.lists)[0]);

        // Model updated
        if (!isEqual(newModel, oldModel)) {
          console.log(
            `${logPrefix} Model ${newModel.label_plural} has been updated. Saving!`
          );
          db.collection("models").updateOne(
            { key: newModel.key },
            { $set: newModel }
          );
        } else {
          console.log(
            `${logPrefix} Model ${newModel.label_plural} has not been changed.`
          );
        }
      } else {
        // Model doesn't exist, insert
        console.log(
          `${logPrefix} Model ${model.label_plural} doesn't yet exist. Creating it.`
        );

        await db.collection("models").insertOne(model);
      }

      return model;
    }, models[0]);

    resolve();
  });

const updateObjects = (objects, db: Db, logPrefix: string) =>
  new Promise<void>(async (resolve, reject) => {
    const objectIds = objects.map((o) => new ObjectId(o._id.$oid));
    const oldObjects = await (
      await db.collection("objects").find({ _id: { $in: objectIds } })
    ).toArray();

    await objects.reduce(async (prev, object) => {
      await prev;
      const oldObject = find(oldObjects, (o) => o._id === object._id);
      if (oldObject && !isEqual(oldObject, object)) {
        console.log(`Object ${oldObject._id.$oid} has changed, updating!`);

        delete object._id;

        await db
          .collection("objects")
          .updateOne({ _id: oldObject._id }, { $set: object });
      }

      return object;
    }, objects[0]);

    resolve();
  });
