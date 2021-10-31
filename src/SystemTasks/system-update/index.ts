import { SystemTaskObjectType } from "../../Utils/Types";
const shell = require("shelljs");

const SystemUpdate = async (
  inputTask: SystemTaskObjectType,
  updateTask: (
    task: SystemTaskObjectType,
    fieldsToUpdate: { [key: string]: any }
  ) => Promise<SystemTaskObjectType>
) => {
  // Indicate that we've started
  let task = await updateTask(inputTask, {
    progress: 1,
    log: [
      ...(inputTask.log || [{ time: new Date(), label: "Task started" }]),
      { time: new Date(), label: "Client: Looking for updates" },
    ],
  });

  let updateApplied = false;

  // Step 1: Client
  let result = await shell.exec("git -C /opt/frontbase/system/client pull");
  // Todo: does language matter here?
  if (!result.match("up to date")) {
    updateApplied = true;
    task = await updateTask(task, {
      progress: 10,
      log: [
        ...task.log,
        { time: new Date(), label: "Client: Installing update" },
      ],
    });

    await shell.exec(
      "yarn --cwd ../client install && yarn --cwd ../client build"
    );
  }

  // Step 2: Server
  task = await updateTask(task, {
    progress: 25,
    log: [
      ...task.log,
      { time: new Date(), label: "Server: Looking for updates" },
    ],
  });

  result = await shell.exec("git -C /opt/frontbase/system/server pull");
  if (!result.match("up to date")) {
    updateApplied = true;
    task = await updateTask(task, {
      progress: 30,
      log: [
        ...task.log,
        { time: new Date(), label: "Server: Installing update" },
      ],
    });

    result = await shell.exec("yarn --cwd ../server install");
  }

  // Step 3: Engine
  task = await updateTask(task, {
    progress: 50,
    log: [
      ...task.log,
      { time: new Date(), label: "Engine: Looking for updates" },
    ],
  });
  result = await shell.exec("git -C /opt/frontbase/system/engine pull");
  if (!result.match("up to date")) {
    task = await updateTask(task, {
      progress: 55,
      log: [
        ...task.log,
        { time: new Date(), label: "Engine: Installing update" },
      ],
    });

    result = await shell.exec("yarn --cwd ../engine install");
  }

  // Step 5: Supervisor
  task = await updateTask(task, {
    progress: 90,
    log: [
      ...task.log,
      { time: new Date(), label: "Supervisor: Looking for updates" },
    ],
  });
  result = await shell.exec("git -C /opt/frontbase/system/supervisor pull");
  if (!result.match("up to date")) {
    task = await updateTask(task, {
      progress: 95,
      log: [
        ...task.log,
        { time: new Date(), label: "Supervisor: Installing update" },
      ],
    });

    result = await shell.exec("yarn --cwd ../supervisor install");
  }
  task = await updateTask(task, {
    progress: 100,
    log: [
      ...task.log,
      {
        time: new Date(),
        label: updateApplied ? "update-applied" : "no-update-found",
      },
    ],
    done: true,
  });
};

export default SystemUpdate;
