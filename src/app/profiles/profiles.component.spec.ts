import { TestBed, async } from '@angular/core/testing';
import { ProfilesComponent } from './profiles-app.component';
import { ProfilesModule } from './profiles-app.module';
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { RouterTestingModule } from '@angular/router/testing';
import { of, Observable } from 'rxjs';
import { Profile } from './profile';
import { LocationStrategy, APP_BASE_HREF } from '@angular/common';

describe('ProfilesComponent', () => {
    beforeEach(async(() => {
    TestBed.configureTestingModule({
            imports: [
            ProfilesModule,
        RouterTestingModule.withRoutes([])
        ],
        providers: [
        { provide: RunboxWebmailAPI, useValue: {
            getAllProfiles: (): Observable<Profile[]> => of([]) }
        }
        ]
    }).compileComponents();
    }));
});
