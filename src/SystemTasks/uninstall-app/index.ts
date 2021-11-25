import { SystemTaskObjectType } from "../../Utils/Types";
import axios from "axios";
import { Db, ObjectId } from "mongodb";

const UninstallApp = async (
  inputTask: SystemTaskObjectType,
  updateTask: (
    task: SystemTaskObjectType,
    fieldsToUpdate: { [key: string]: any }
  ) => Promise<SystemTaskObjectType>,
  db: Db
) => {
  // Indicate that we've started
  let task = await updateTask(inputTask, {
    progress: 1,
    log: [
      ...inputTask.log,
      { time: new Date(), label: "Fetching information" },
    ],
  });

  // Fetch remote install information
  axios(
    `https://frontbase.vtvc.nl/api/frontbase-apps/read?key=${inputTask.args.appKey}`
  ).then(async (response) => {
    if (response.status !== 200) {
      console.log("Fetch error " + response.status);
      return;
    }
    const remoteApp = response.data;

    let task = await updateTask(inputTask, {
      progress: 10,
      log: [
        ...inputTask.log,
        { time: new Date(), label: "Starting uninstall" },
      ],
    });

    // Type specific actions
    if (remoteApp.type === "collection") {
      // Collection
      let currentProgress = 20;
      let currentStep = 0;
      await remoteApp.install_script.reduce(async (prev, installStep) => {
        await prev;

        // Increase
        currentProgress += (30 / remoteApp.install_script.length) * currentStep;

        // Execute the install step
        switch (installStep.command) {
          case "models":
            task = await updateTask(inputTask, {
              progress: currentProgress,
              log: [
                ...inputTask.log,
                { time: new Date(), label: "Cleaning up models" },
              ],
            });

            const modelKeys = [];
            JSON.parse(remoteApp.models).map((nm) => {
              modelKeys.push(new ObjectId(nm._id.$oid));
            });

            await db
              .collection("models")
              .deleteMany({ _id: { $in: modelKeys } });
            break;
          case "objects":
            task = await updateTask(inputTask, {
              progress: currentProgress,
              log: [
                ...inputTask.log,
                { time: new Date(), label: "Cleaning up objects" },
              ],
            });

            const objectKeys = [];
            JSON.parse(remoteApp.objects).map((nm) => {
              objectKeys.push(new ObjectId(nm._id.$oid));
            });

            await db
              .collection("objects")
              .deleteMany({ _id: { $in: objectKeys } });
            break;
          default:
            console.log(`Unknown install step type ${installStep.command}`);

            break;
        }

        currentStep++;

        return installStep;
      }, remoteApp.install_script[0]);

      task = await updateTask(inputTask, {
        progress: 100,
        done: true,
        log: [...inputTask.log, { time: new Date(), label: "App installed!" }],
      });
    } else {
      console.log("Todo: Code based");
    }
  });
};

export default UninstallApp;
