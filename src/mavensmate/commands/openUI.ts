import { ClientCommand } from './clientCommand';
import { BaseCommand } from './baseCommand';

class OpenUI extends ClientCommand {
    static create(): BaseCommand {
        return new OpenUI();
    }

    constructor() {
        super('Open UI', 'open-ui');
        this.async = false;
        this.body.args.ui = true;
        this.allowWithoutProject = true;
    }

    onSuccess(response) {
        return super.onSuccess(response);
    }
}

export = OpenUI;