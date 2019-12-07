export class Profile {
    id:         number
    profile:    string
    name:       string
    from:       string
    reply_to:   string
    signature:  string
    
    constructor(properties: any) {
        for (var key in properties) {
	    this[key] = properties[key]
	}
    }
    
//  display_profile() : string {
//      if (this.profile) {
//      return this.profile
//  }
//  }
}
