// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

import * as child_process from 'child_process';
import {CordovaProjectHelper} from '../utils/cordovaProjectHelper';
import * as os from 'os';
import * as Q from 'q';
import * as util from 'util';
import * as TreeKill from 'tree-kill';

export function execCommand(command: string, args: string[], errorLogger: (message: string) => void): Q.Promise<string> {
    let deferred = Q.defer<string>();
    let proc = child_process.spawn(command, args, { stdio: 'pipe' });
    let stderr = '';
    let stdout = '';
    proc.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
    });
    proc.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
    });
    proc.on('error', (err: Error) => {
        deferred.reject(err);
    });
    proc.on('close', (code: number) => {
        if (code !== 0) {
            errorLogger(stderr);
            errorLogger(stdout);
            deferred.reject(`Error running '${command} ${args.join(' ')}'`);
        }
        deferred.resolve(stdout);
    });

    return deferred.promise;
}

export function cordovaRunCommand(args: string[], errorLogger: (message: string) => void, cordovaRootPath: string): Q.Promise<string[]> {
    let defer = Q.defer<string[]>();
    let cliName = CordovaProjectHelper.isIonicProject(cordovaRootPath) ? 'ionic' : 'cordova';
    let output = '';
    let stderr = '';
    let process = cordovaStartCommand(args, cordovaRootPath);

    process.stderr.on('data', data => {
        stderr += data.toString();
    });
    process.stdout.on('data', data => {
        output += data.toString();
    });
    process.on('exit', exitCode => {
        if (exitCode) {
            errorLogger(stderr);
            errorLogger(output);
            defer.reject(new Error(util.format('\'%s %s\' failed with exit code %d', cliName, args.join(' '), exitCode)));
        } else {
            defer.resolve([output, stderr]);
        }
    });
    process.on('error', error => {
        defer.reject(error);
    });

    return defer.promise;
}

export function cordovaStartCommand(args: string[], cordovaRootPath: string): child_process.ChildProcess {
    let cliName = CordovaProjectHelper.isIonicProject(cordovaRootPath) ? 'ionic' : 'cordova';
    let commandExtension = os.platform() === 'win32' ? '.cmd' : '';
    let command = cliName + commandExtension;
    return child_process.spawn(command, args, { cwd: cordovaRootPath });
}

export function killChildProcess(childProcess: child_process.ChildProcess): Q.Promise<void> {
    let deferred = Q.defer<void>();
    let killCallback = (error) => {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve();
        }
    }

    TreeKill(childProcess.pid, 'SIGKILL', killCallback);
    return deferred.promise;
}