/** A backup destination already contains a file that must be preserved. */
export class BackupExistsError extends Error {
  constructor() {
    super('Choose a new filename for the backup');
    this.name = 'BackupExistsError';
  }
}
