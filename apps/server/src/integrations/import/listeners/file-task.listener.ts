import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { QueueJob } from '../../queue/constants';
import { FileTaskStatus } from '../utils/file.utils';
import { FileTaskService } from '../services/file-task.service';
import { StorageService } from '../../storage/storage.service';

@Injectable()
export class FileTaskListener {
  private readonly logger = new Logger(FileTaskListener.name);

  constructor(
    private readonly fileTaskService: FileTaskService,
    private readonly storageService: StorageService,
  ) {}

  @OnEvent(QueueJob.IMPORT_TASK)
  async handleImportTask(data: { fileTaskId: string }) {
    try {
      this.logger.debug(`Processing import task ${data.fileTaskId}`);
      await this.fileTaskService.processZIpImport(data.fileTaskId);
      this.logger.log(`Completed import task ${data.fileTaskId}`);
    } catch (err) {
      this.logger.error(`Error processing import task ${data.fileTaskId}`, err);
      await this.fileTaskService.updateTaskStatus(
        data.fileTaskId,
        FileTaskStatus.Failed,
        err instanceof Error ? err.message : String(err),
      );
      
      const fileTask = await this.fileTaskService.getFileTask(data.fileTaskId);
      if (fileTask) {
        await this.storageService.delete(fileTask.filePath);
      }
    }
  }
}
