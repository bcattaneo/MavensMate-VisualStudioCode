'use strict';
import { window, OutputChannel, Disposable } from 'vscode';
import { MavensMateClient } from '../mavensmate/mavensMateClient';
import { getConfiguration } from './mavensMateConfiguration';
import Promise = require('bluebird');

export class MavensMateChannel implements Disposable {
    channel: OutputChannel;
    waitingOnCount: number;
    waitingDelay: number;
    isShowing: boolean;
    isWaiting: boolean;

    private static _instance: MavensMateChannel = null;
    static getInstance(): MavensMateChannel{
        if(MavensMateChannel._instance == null){
            MavensMateChannel._instance = new MavensMateChannel();
        }
        return MavensMateChannel._instance;
    }

    constructor(){
        if(MavensMateChannel._instance){
            throw new Error("Error: Instantiation failed. Singleton module! Use .getInstance() instead of new.");
        }
        MavensMateChannel._instance = this;
        this.channel = window.createOutputChannel('MavensMate');
        this.waitingOnCount = 0;
        this.waitingDelay = getConfiguration<number>('mavensMate.hideOutputDelay');
        this.isShowing = false;
        this.isWaiting = false;
    }

    appendStatus(message: string){
        return this.appendLine(message, 'STATUS');
    }

    appendError(message: string){
        return this.appendLine(message, 'ERROR');
    }

    appendLine(message: string, level?: string){
        return Promise.resolve().then(() => {
            let promiseResult = null;
            let tabs = (level && level.length > 5 ? 1 : 2);
            let formattedMessage = `${ '\t'.repeat(tabs) }${message}`;
            if(level){
                formattedMessage = `[${level}]${formattedMessage}`;
            } else {
                formattedMessage = '\t\t' + formattedMessage;
            }
            this.channel.appendLine(formattedMessage);

            if(!this.isShowing) {
                this.show();
            }

            if(this.waitingOnCount == 0 && this.isWaiting == false){
                this.isWaiting = true;
                promiseResult = Promise.resolve().then(() => {
                    setTimeout(function () {
                      if(this.waitingOnCount == 0){
                          if(level == 'STATUS' && getConfiguration<boolean>('mavensMate.hideOutputOnSuccess')){
                              this.hide();
                          }
                          this.isWaiting = false;
                      }
                    }, this.waitingDelay);
                });
            }
            return promiseResult;
        });
    }

    show(){
        this.channel.show();
        this.isShowing = true;
    }

    hide(){
        this.channel.hide();
        this.isShowing = false;
    }

    toggle(): Thenable<any>{
        if(this.isShowing){
            this.hide();
            return Promise.resolve();
        } else {
            this.waitingOnCount++;
            this.show();
            return Promise.resolve().then(() => {
                setTimeout(function() {
                  this.waitingOnCount--;
                }, this.waitingDelay);
            });
        }
    }

    dispose(){
        this.channel.dispose();
    }
}