"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fetch_1 = require("node-fetch");
const installApp = (db, key) => __awaiter(void 0, void 0, void 0, function* () {
    return new Promise((resolve, reject) => {
        // Announce
        const logPrefix = `(installing ${key})`;
        console.log(`${logPrefix} Install started`);
        node_fetch_1.default(`https://store.frontbase.io/manifests/${key}.json`).then((response) => __awaiter(void 0, void 0, void 0, function* () {
            // Success
            const appScript = yield response.json();
            yield appScript.script.reduce(
            // @ts-ignore
            (curr, prev) => __awaiter(void 0, void 0, void 0, function* () {
                yield performInstallScriptStep(curr, key, db);
                return prev;
            }), appScript.script[0]);
            resolve();
        }), (error) => {
            // Something went wrong!
            console.log(`${logPrefix} Couldn't fetch app script for ${key}`, error);
            reject();
        });
    });
});
exports.default = installApp;
const performInstallScriptStep = (step, key, db) => new Promise((resolve, reject) => {
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
const installModels = (step, key, db) => new Promise((resolve, reject) => {
    // Installs the models based on the manifest on the store.
    // Installing is relatively easy and only requires a check if a model already exists.
    if (step.data) {
        // Fetch the models from the repository
        const repoUrl = `https://store.frontbase.io/manifests/${key}-${step.data}.json`;
        const logPrefix = `(installing ${key})`;
        console.log(`${logPrefix} Fetching models from repository ${repoUrl}`);
        node_fetch_1.default(repoUrl).then((response) => __awaiter(void 0, void 0, void 0, function* () {
            const models = yield response.json();
            // Loop through models
            yield models.reduce((curr, prev) => __awaiter(void 0, void 0, void 0, function* () {
                const model = yield curr;
                if (yield db.collection("models").findOne({ key: model.key })) {
                    console.log(`${logPrefix} Error: model ${model.label_plural} (${model.key}) already exists!`);
                    reject;
                }
                else {
                    yield db.collection("models").insertOne(model);
                    console.log(`${logPrefix} Model ${model.label_plural} (${model.key}) created`);
                }
                return prev;
            }), models[0]);
            resolve();
        }), (error) => {
            // Something went wrong!
            console.log(`Couldn't fetch app models`, error);
            reject();
        });
    }
    else {
        console.log("Data is missing from install script step");
        reject();
    }
});
//# sourceMappingURL=install.js.map