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
const mongodb_1 = require("mongodb");
const install_1 = require("./actions/apps/install");
const express = require("express");
const path = require("path");
// This file performs a database check
// If everything is in order it will start the actual supervisor
// If anything is wrong it will spin up a mini server showing we're still initialising.
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("(init) Checking database state...");
        // we'll add code here soon
        const uri = "mongodb://root:ceYbc6VDwf2K3p38Y648Tm6PuDJVaBvL@192.168.0.2:29019/FrontBase?authSource=admin&replicaSet=replicaset&readPreference=primaryPreferred&directConnection=true&ssl=false&appname=Frontbase%20Server";
        const client = new mongodb_1.MongoClient(uri, {
            //@ts-ignore
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        try {
            yield client.connect();
            const databasesList = yield client.db().admin().listDatabases();
            let databaseExists = false;
            let db;
            //@ts-ignore
            databasesList.databases.forEach((_db) => {
                if (_db.name === "FrontBase")
                    db = _db;
            });
            if (db) {
                console.log("(init) Checks passed.");
                process.exit(0);
            }
            else {
                // Socket on uninitialised state
                console.log("(init) Database is uninitialised.. Serving loading page and performing initialisation.");
                let app = express();
                const port = 8600;
                app.get("/", express.static(path.join(__dirname, "..", "static", "pages", "uninitialised")));
                let server = app.listen(port, () => {
                    console.log(`Preview FrontBase during set-up at http://localhost:${port}`);
                });
                // Install system dependencies
                install_1.default(client.db("FrontBase"), "system").then(() => {
                    // Success
                    // Close express server
                    server.close();
                    // Exit process succesfully (automatically starts up actual supervisor)
                    process.exit(0);
                }, () => {
                    // Failure
                    // Close express server
                    server.close();
                    let app = express();
                    const port = 8600;
                    app.get("/", express.static(path.join(__dirname, "..", "static", "pages", "error_initialising")));
                    server = app.listen(port, () => {
                        console.log(`Preview FrontBase during set-up at http://localhost:${port}`);
                    });
                });
            }
        }
        catch (e) {
            // Socket on db error state
            console.error("Error state", e);
        }
    });
}
main();
//# sourceMappingURL=startupChecks.js.map