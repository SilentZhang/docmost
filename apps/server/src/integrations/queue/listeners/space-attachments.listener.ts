import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { QueueJob } from '../constants';
import { Space } from '@docmost/db/types/entity.types';
import { StorageService } from '../../storage/storage.service';

@Injectable()
export class SpaceAttachmentsListener {
  private readonly logger = new Logger(SpaceAttachmentsListener.name);

  constructor(private readonly storageService: StorageService) {}

  @OnEvent(QueueJob.DELETE_SPACE_ATTACHMENTS)
  async handleDeleteSpaceAttachments(space: Space) {
    try {
      this.logger.debug(`Deleting attachments for space ${space.id}`);
      await this.storageService.deleteSpaceAttachments(space.id);
      this.logger.log(`Successfully deleted attachments for space ${space.id}`);
    } catch (err) {
      this.logger.error(
        `Error deleting attachments for space ${space.id}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}
