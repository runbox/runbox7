export class FolderListEntry {
    isExpandable?: boolean;
    priority?: number; // for sorting order

    constructor(
        public folderId: number,
        public newMessages: number,
        public totalMessages: number,
        public folderType: string,
        public folderName: string,
        public folderPath: string,
        public folderLevel: number) {
    }
}
