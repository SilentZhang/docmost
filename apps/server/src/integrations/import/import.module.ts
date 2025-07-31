import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ImportService } from './services/import.service';
import { ImportController } from './import.controller';
import { StorageModule } from '../storage/storage.module';
import { FileTaskService } from './services/file-task.service';
import { ImportAttachmentService } from './services/import-attachment.service';
import { FileTaskController } from './file-task.controller';
import { PageModule } from '../../core/page/page.module';
import { FileTaskListener } from './listeners/file-task.listener';

@Module({
  providers: [
    ImportService,
    FileTaskService,
    ImportAttachmentService,
    FileTaskListener,
  ],
  exports: [ImportService, ImportAttachmentService],
  controllers: [ImportController, FileTaskController],
  imports: [StorageModule, PageModule, EventEmitterModule.forRoot()],
})
export class ImportModule {}
