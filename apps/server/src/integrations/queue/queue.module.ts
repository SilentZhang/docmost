import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { QueueService } from './queue.service';
import { QueueName } from './constants';
import { BacklinksListener } from './listeners/backlinks.listener';
import { SpaceAttachmentsListener } from './listeners/space-attachments.listener';

@Global()
@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [QueueService, BacklinksListener, SpaceAttachmentsListener],
  exports: [QueueService],
})
export class QueueModule {}
