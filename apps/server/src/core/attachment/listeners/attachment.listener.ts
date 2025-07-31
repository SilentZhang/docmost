import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AttachmentService } from '../services/attachment.service';
import { Space } from '@docmost/db/types/entity.types';
import { User } from '@docmost/db/types/entity.types';

@Injectable()
export class AttachmentListener {
  private readonly logger = new Logger(AttachmentListener.name);
  
  constructor(private readonly attachmentService: AttachmentService) {}

  @OnEvent('attachment.delete-space-attachments')
  async handleDeleteSpaceAttachments(space: Space) {
    try {
      await this.attachmentService.handleDeleteSpaceAttachments(space.id);
      this.logger.debug(`Deleted attachments for space ${space.id}`);
    } catch (err) {
      this.logger.error(
        `Error deleting attachments for space ${space.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }
  }

  @OnEvent('attachment.delete-user-avatars') 
  async handleDeleteUserAvatars(userId: string) {
    try {
      await this.attachmentService.handleDeleteUserAvatars(userId);
      this.logger.debug(`Deleted avatars for user ${userId}`);
    } catch (err) {
      this.logger.error(
        `Error deleting avatars for user ${userId}: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }
  }
}
