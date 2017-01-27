// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as Q from 'q';
import * as rimraf from 'rimraf';
import * as vscode from 'vscode';

import * as testUtils from './testUtils';
import {CordovaCommandHelper} from './../src/utils/cordovaCommandHelper';
import {CordovaProjectHelper} from './../src/utils/cordovaProjectHelper';

suite("VSCode Cordova extension - intellisense and command palette tests", () => {
    let testProjectPath: string = path.resolve(__dirname, "..", "..", "test", "testProject");
    let testPlugin: string = path.resolve(__dirname, "..", "..", "test", "testPlugin");
    let testPluginName: string = "test-plugin";
    let cordovaTypeDefDir: string = CordovaProjectHelper.getOrCreateTypingsTargetPath(testProjectPath);
    let typingReferencePath: string = path.resolve(__dirname, "..", "..", "test", "testProject", "typings", "cordova-typings.d.ts");

    suiteTeardown(() => {
        // Cleanup the target folder for type definitions
        if (CordovaProjectHelper.existsSync(cordovaTypeDefDir)) {
            rimraf.sync(cordovaTypeDefDir);
        }

        // Remove the FileSystem and whitelist plugins from the testProject
        return testUtils.removeCordovaComponents("plugin", testProjectPath, ["cordova-plugin-file", "cordova-plugin-whitelist"]);
    });

    function checkTypeDefinitions(expectedTypedDefs: string[]) {
        let actualTypeDefs = testUtils.enumerateListOfTypeDefinitions(testProjectPath);
        assert.deepEqual(actualTypeDefs, expectedTypedDefs);
    };

    function checkReferenceFileContainPlugin(pluginName: string, expectedResult: boolean) {
         return fs.readFile(typingReferencePath, 'utf8', (err, data) => {
            assert.ifError(err);
            let pluginRelativePath: string = path.join("cordova", "plugins", `${testPluginName}.d.ts`);
            assert.equal(data.indexOf(pluginRelativePath) > 0 || data.replace(/\\/g, '/').indexOf(pluginRelativePath) > 0, expectedResult);
        });
    }

    test('#Plugin type definitions are installed on activation', () => {
        return Q.delay(10000).then(() => {
            checkTypeDefinitions(["FileSystem.d.ts"]);
        });
    });

    test('#Plugin type defintion for a plugin is added upon adding that plugin', () => {
        return testUtils.addCordovaComponents("plugin", testProjectPath, ["cordova-plugin-device"])
            .then(() => {
                return Q.delay(10000);
            }).then(() => {
                checkTypeDefinitions(["Device.d.ts", "FileSystem.d.ts"]);
            });
    });

    test('#Plugin type definition for a plugin is removed after removal of that plugin', () => {
        return testUtils.removeCordovaComponents("plugin", testProjectPath, ["cordova-plugin-device"])
            .then(() => {
                return Q.delay(10000);
            }).then(() => {
                checkTypeDefinitions(["FileSystem.d.ts"]);
            });
    });

    test("#Plugin type definition for a plugin is added from '<pluginName>/types'", () => {
        return testUtils.addCordovaComponents("plugin", testProjectPath, [testPlugin])
            .then(() => {
                return Q.delay(10000);
            }).then(() => {
                checkTypeDefinitions(["FileSystem.d.ts", "test-plugin.d.ts"]);
            });
    });

    test("#Reference to custom plugin's type definition is added upon adding that plugin", () => {
        assert(fs.existsSync(typingReferencePath));
        checkReferenceFileContainPlugin(testPluginName, true);
    });

    test("#Reference to custom plugin's type definition is removed after removal of that plugin", () => {
        assert(fs.existsSync(typingReferencePath));
        return testUtils.removeCordovaComponents("plugin", testProjectPath, [testPluginName])
            .then(() => {
                return Q.delay(10000);
            }).then(() => {
                checkTypeDefinitions(["FileSystem.d.ts"]);
                checkReferenceFileContainPlugin(testPluginName, false);
            });
    });

   test('#Verify that the commands registered by Cordova extension are loaded', () => {
        return vscode.commands.getCommands(true)
            .then((results) => {
                let cordovaCmdsAvailable = results.filter((commandName: string) => {
                    return commandName.indexOf("cordova.") > -1
                });
                assert.deepEqual(cordovaCmdsAvailable, ["cordova.prepare", "cordova.build", "cordova.run", "cordova.simulate.android", "cordova.simulate.ios"])
            });
    });

    test('#Execute Commands from the command palette', () => {
        return testUtils.addCordovaComponents("platform", testProjectPath, ["android"])
            .then(() => {
                return vscode.commands.executeCommand("cordova.build");
            }).then(() => {
                return Q.delay(10000);
            }).then(res => {
                let androidBuildPath = path.resolve(testProjectPath, "platforms", "android", "build");
                assert.ok(CordovaProjectHelper.existsSync(androidBuildPath));
                return testUtils.removeCordovaComponents("platform", testProjectPath, ["android"])
            });
    });

    test('#Verify that the simulate command launches the simulate server', () => {
        return testUtils.addCordovaComponents("platform", testProjectPath, ["android"])
            .then(() => vscode.commands.executeCommand("cordova.simulate.android"))
            .then(() => testUtils.isUrlReachable('http://localhost:8000/simulator/index.html'))
            .then((simHostStarted: boolean) => assert(simHostStarted, "The simulation host is running."))
            .then(() => testUtils.isUrlReachable('http://localhost:8000/index.html'))
            .then((appHostStarted: boolean) => assert(appHostStarted, "The application host is running."))
            .fin(() => testUtils.removeCordovaComponents("platform", testProjectPath, ["android"]));
    });
});
