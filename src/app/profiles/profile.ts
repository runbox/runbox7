export class Profile {
    id:         number;
    profile:    string;
    name:       string;
    from:       string;
    reply_to:   string;
    signature:  string;

    constructor(properties: any) {
        const self = this;
        properties.forEach( key => self[key] = properties[key] );
    }
}
