import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { QueueName } from './constants';

@Injectable()
export class QueueService {
  constructor(private eventEmitter: EventEmitter2) {}

  async add(queueName: QueueName, jobName: string, data: any) {
    this.eventEmitter.emit(`${queueName}.${jobName}`, data);
  }

  async process(queueName: QueueName, jobName: string, callback: (job: any) => Promise<void>) {
    this.eventEmitter.on(`${queueName}.${jobName}`, callback);
  }
}
