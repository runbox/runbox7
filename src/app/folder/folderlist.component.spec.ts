import { FolderListComponent } from './folderlist.component';
import { MessageListService } from '../rmmapi/messagelist.service';
import { RunboxWebmailAPI, FolderCountEntry } from '../rmmapi/rbwebmail';
import { BehaviorSubject } from 'rxjs';
import { async, tick, TestBed, getTestBed } from '@angular/core/testing';
import { MessageInfo } from '../xapian/messageinfo';
import { last, take } from 'rxjs/operators';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MatSnackBarModule, MatDialogModule } from '@angular/material';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
describe('FolderListComponent', () => {
    let injector: TestBed;
    let service: RunboxWebmailAPI;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
        imports: [
                HttpClientTestingModule,
                MatSnackBarModule,
                MatDialogModule,
                NoopAnimationsModule
            ],
        providers: [RunboxWebmailAPI]
        });
        injector = getTestBed();
        service = injector.get(RunboxWebmailAPI);
        httpMock = injector.get(HttpTestingController);
    });
    it('should empty trash', async(async () => {
        let selectedFolderName: string;
        const messagesInViewSubject = new BehaviorSubject<MessageInfo[]>([]);
        const messagesToDelete = new Array(100).fill(null).map((val, ndx) =>
            new MessageInfo((ndx + 1), new Date(), new Date(), 'Realtrash', false, false, false,
                [], [], [], [], `subject ${ndx}`, `plaintext ${ndx}`, 20, false)
        );
        expect(messagesToDelete[50].id).toBe(51);

        let refreshFolderCountCalled = false;

        const comp = new FolderListComponent(
            {
                folderCountSubject: new BehaviorSubject([
                    new FolderCountEntry(1,
                        50, 40, 'inbox', 'INNBOKS', 'Inbox', 0),
                    new FolderCountEntry(2,
                            50, 40, 'user', 'Trash', 'Trash', 0),
                    new FolderCountEntry(3,
                        50, 40, 'trash', 'Realtrash', 'Realtrash', 0)
                ]),
                messagesInViewSubject: messagesInViewSubject,
                setCurrentFolder: (folder: string) => {
                    selectedFolderName = folder;
                    if (selectedFolderName === 'Realtrash') {
                        console.log('selecting folder', selectedFolderName);
                        setTimeout(() => messagesInViewSubject.next(messagesToDelete), 0);
                    }
                },
                refreshFolderCount: () => {
                    refreshFolderCountCalled = true;
                }
            } as MessageListService,
            service,
            null
        );

        await comp.emptyTrash();

        expect(selectedFolderName).toBe('Realtrash');
        const messagesSelectedForDelete = await comp.messagelistservice.messagesInViewSubject.pipe(
                take(2),
                last()
            ).toPromise();

        expect(messagesSelectedForDelete.length).toBe(messagesToDelete.length);
        messagesSelectedForDelete.forEach(msg => {
            const req = httpMock.expectOne(`/rest/v1/email/${msg.id}`);
            expect(req.request.method).toBe('DELETE');
            req.flush(200);
        });
        expect(refreshFolderCountCalled).toBeTruthy();
    }));
});
