import { Injectable } from '@angular/core';

// adopted from https://stackoverflow.com/a/42766146
@Injectable()
export class ScriptLoaderService {
    scripts = {
        stripe: { loaded: false, src: 'https://js.stripe.com/v3/' }
    };

    loadScript(name: string): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.scripts[name].loaded) {
                resolve();
            } else {
                const script = document.createElement('script');
                script.type = 'text/javascript';
                script.src = this.scripts[name].src;

                script.onload = () => {
                    this.scripts[name].loaded = true;
                    resolve();
                };

                script.onerror = (error: any) => reject(error);

                document.getElementsByTagName('head')[0].appendChild(script);
            }
        });
    }
}
