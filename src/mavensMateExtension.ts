'use strict';
import * as vscode from 'vscode';
import Promise = require('bluebird');

import { MavensMateChannel } from '../src/vscode/mavensMateChannel';
import { ProjectSettings } from '../src/mavensmate/projectSettings';
import { MavensMateClient } from '../src/mavensmate/mavensMateClient';
import { MavensMateStatus } from '../src/vscode/mavensMateStatus';
import { MavensMateCodeCoverage } from '../src/vscode/mavensMateCodeCoverage';
import * as CommandRegistrar from '../src/vscode/commandRegistrar';
import { getConfiguration } from './vscode/mavensMateConfiguration';


export class MavensMateExtension {
    context: vscode.ExtensionContext;
    mavensMateChannel: MavensMateChannel;
    mavensMateStatus: MavensMateStatus;
    mavensMateClient: MavensMateClient;
    mavensMateCodeCoverage: MavensMateCodeCoverage;

    static create(context: vscode.ExtensionContext){
        return new MavensMateExtension(context);
    }

    constructor(context: vscode.ExtensionContext){
        this.context = context;
    }

    activate(context: vscode.ExtensionContext) {

        this.mavensMateChannel = MavensMateChannel.getInstance();
        this.mavensMateStatus = MavensMateStatus.getInstance();
        this.mavensMateClient = MavensMateClient.getInstance();
        this.mavensMateCodeCoverage = MavensMateCodeCoverage.getInstance();
        this.mavensMateChannel.appendStatus('MavensMate: Activating');

        return Promise.resolve().bind(this)
            .then(() => this.checkProjectSettingsAndSubscribe())
            .then(() => CommandRegistrar.registerCommands())
            .then(() => {
                if(getConfiguration<boolean>('mavensMate.pingMavensMateOnStartUp')){
                    this.mavensMateClient.isAppAvailable();
                } else {
                    console.log(`MavensMate: Not pinging MavensMate Desktop on Startup, controlled by mavensMate.pingMavensMateOnStartUp`);
                }
            });
    }

    checkProjectSettingsAndSubscribe(){
        if(ProjectSettings.hasProjectSettings()){
            let projectSettings = ProjectSettings.getProjectSettings();
            this.mavensMateChannel.appendStatus(`Instantiating with Project: ${projectSettings.projectName} (${ projectSettings.instanceUrl })`);
            return this.subscribeToEvents();
        } else {
            this.mavensMateChannel.appendStatus(`Instantiating without Project`);
        }
    }

    instantiateWithoutProject(){
        
        let withProject = false;
        
        CommandRegistrar.registerCommands();
    }

    subscribeToEvents(){
        let saveEvent = vscode.workspace.onDidSaveTextDocument((textDocument) => {
            let compileOnSaveConfigured = getConfiguration('mavensMate.compileOnSave');
            let isApexScript = textDocument.fileName.includes('apex-scripts');
            let isMetadata = textDocument.fileName.includes('src');

            if (!compileOnSaveConfigured) {
                console.info('MavensMate: compileOnSave is not configured.');
            } else if (isApexScript) {
                console.info('MavensMate: silently ignoring the saving of a local apex script. (OK you got me, this isn\'t necessarily silence)');
            } else if (isMetadata) {
                return vscode.commands.executeCommand('mavensmate.compileFile', textDocument.uri);
            } else {
                console.info('MavensMate: silently ignoring the saving of a non-metadata file (not under a src directory');
            }
        });
        this.context.subscriptions.push(saveEvent);

        this.mavensMateChannel.appendStatus('Subscribed to events');
    }

    deactivate() {
        this.mavensMateChannel.appendStatus('Deactivating');
        this.mavensMateChannel.dispose();
        this.mavensMateClient.dispose();
        this.mavensMateStatus.dispose();
        this.mavensMateCodeCoverage.dispose();
        console.info(`MavensMate: Finished Deactivating`);
    }
}
