import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { ProfilesModule } from './profiles.module';
import { enableProdMode } from '@angular/core'

const platform = platformBrowserDynamic();
platform.bootstrapModule(ProfilesModule);
