import * as vscode from 'vscode';
import * as path from 'path';
import {CordovaProjectHelper} from './cordovaProjectHelper'

export class TypingInfo {
    private static CORDOVA_TYPINGS_FOLDERNAME = "CordovaTypings";
    private static CORDOVA_TYPINGS_PATH = path.resolve(__dirname, "..", "..", "..", TypingInfo.CORDOVA_TYPINGS_FOLDERNAME);
    private static PROJECT_TYPINGS_PLUGINS_FOLDERNAME = "plugins";
    private static PROJECT_TYPINGS_CORDOVA_FOLDERNAME = "cordova";

    public typingFile: string;
    public pluginName: string;
    public src: string;
    public dest: string;

    constructor(typingFile: string, pluginName?: string) {
        let cordovaProjectRoot = CordovaProjectHelper.getCordovaProjectRoot(vscode.workspace.rootPath);
        let typingFolderPath = CordovaProjectHelper.getOrCreateTypingsTargetPath(cordovaProjectRoot);

        this.typingFile = typingFile;
        this.pluginName = pluginName;
        this.src = path.resolve(TypingInfo.CORDOVA_TYPINGS_PATH, this.typingFile);
        this.dest = path.resolve(typingFolderPath, this.getTypingRelativePath());
    }

    public isDefinedByPlugin(): boolean {
        return !!this.pluginName;
    }

    public getTypingRelativePath(): string {
        return this.isDefinedByPlugin() ?
                path.join(TypingInfo.PROJECT_TYPINGS_CORDOVA_FOLDERNAME, TypingInfo.PROJECT_TYPINGS_PLUGINS_FOLDERNAME, `${this.pluginName}.d.ts`) :
                this.typingFile;
    }
}

