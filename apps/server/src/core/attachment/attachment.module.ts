import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AttachmentService } from './services/attachment.service';
import { AttachmentController } from './attachment.controller';
import { StorageModule } from '../../integrations/storage/storage.module';
import { UserModule } from '../user/user.module';
import { WorkspaceModule } from '../workspace/workspace.module';
import { TokenModule } from '../auth/token.module';
import { AttachmentListener } from './listeners/attachment.listener';

@Module({
  imports: [EventEmitterModule.forRoot(), StorageModule, UserModule, WorkspaceModule, TokenModule],
  controllers: [AttachmentController],
  providers: [AttachmentService, AttachmentListener],
})
export class AttachmentModule {}
