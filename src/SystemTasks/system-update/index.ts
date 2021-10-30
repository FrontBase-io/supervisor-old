import { SystemTaskObjectType } from "../../Utils/Types";
const shell = require("shelljs");

const SystemUpdate = async (
  inputTask: SystemTaskObjectType,
  updateTask: (
    task: SystemTaskObjectType,
    fieldsToUpdate: { [key: string]: any }
  ) => SystemTaskObjectType
) => {
  let task = inputTask;
  // Indicate that we've started
  task = updateTask(task, {
    progress: 1,
    log: [...(task.log || []), `Task started`],
  });

  let updateApplied = false;
  // Step 1: Client
  let result = await shell.exec("git -C /opt/frontbase/system/client pull");
  // Todo: does language matter here?
  if (!result.match("up to date")) {
    updateApplied = true;
    console.log("Client update found. Installing and recompiling.");
    task = updateTask(task, {
      progress: 10,
      log: [...task.log, "Updates found. Installing and recompiling client."],
    });

    await shell.exec(
      "yarn --cwd ../Client install && yarn --cwd ../Client build"
    );
  }

  // Step 2: Server
  task = updateTask(task, {
    progress: 25,
    log: [...task.log, "Finding server updates"],
  });

  result = await shell.exec("git -C /opt/frontbase/system/server pull");
  if (!result.match("up to date")) {
    updateApplied = true;
    task = updateTask(task, {
      progress: 30,
      log: [...task.log, "Server: Installing dependencies"],
    });

    result = await shell.exec("yarn --cwd ../Server install");
  }

  // Step 3: Engine
  console.log("Server: Installing dependencies");
  task = updateTask(task, {
    progress: 50,
    log: [...task.log, "Looking for engine updates"],
  });
  result = await shell.exec("git -C /opt/frontbase/system/engine pull");
  if (!result.match("up to date")) {
    task = updateTask(task, {
      progress: 55,
      log: [...task.log, "Engine: Installing dependencies"],
    });

    result = await shell.exec("yarn --cwd ../engine install");
  }

  // Step 5: Supervisor
  console.log("Supervisor: Installing dependencies");
  task = updateTask(task, {
    progress: 90,
    log: [...task.log, "Looking for supervisor updates"],
  });
  result = await shell.exec("git -C /opt/frontbase/system/supervisor pull");
  if (!result.match("up to date")) {
    task = updateTask(task, {
      progress: 95,
      log: [...task.log, "Supervisor: Installing dependencies"],
    });

    result = await shell.exec("yarn --cwd ../supervisor install");
  }
  task = updateTask(task, {
    progress: 100,
    log: [...task.log, updateApplied ? "update-applied" : "no-update-found"],
    done: true,
  });
};

export default SystemUpdate;
