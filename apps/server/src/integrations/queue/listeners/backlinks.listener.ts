import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { QueueJob, QueueName } from '../constants';
import { IPageBacklinkJob } from '../constants/queue.interface';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';
import { BacklinkRepo } from '@docmost/db/repos/backlink/backlink.repo';
import { executeTx } from '@docmost/db/utils';

@Injectable()
export class BacklinksListener {
  private readonly logger = new Logger(BacklinksListener.name);

  constructor(
    @InjectKysely() private readonly db: KyselyDB,
    private readonly backlinkRepo: BacklinkRepo,
  ) {}

  @OnEvent(QueueJob.PAGE_BACKLINKS)
  async handlePageBacklinks(job: IPageBacklinkJob) {
    try {
      const { pageId, mentions, workspaceId } = job;

      await executeTx(this.db, async (trx) => {
        const existingBacklinks = await trx
          .selectFrom('backlinks')
          .select('targetPageId')
          .where('sourcePageId', '=', pageId)
          .execute();

        if (existingBacklinks.length === 0 && mentions.length === 0) {
          return;
        }

        const existingTargetPageIds = existingBacklinks.map(
          (backlink) => backlink.targetPageId,
        );

        const targetPageIds = mentions
          .filter((mention) => mention.entityId !== pageId)
          .map((mention) => mention.entityId);

        let validTargetPages = [];
        if (targetPageIds.length > 0) {
          validTargetPages = await trx
            .selectFrom('pages')
            .select('id')
            .where('id', 'in', targetPageIds)
            .where('workspaceId', '=', workspaceId)
            .execute();
        }

        const validTargetPageIds = validTargetPages.map((page) => page.id);

        const backlinksToAdd = validTargetPageIds.filter(
          (id) => !existingTargetPageIds.includes(id),
        );

        const backlinksToRemove = existingTargetPageIds.filter(
          (existingId) => !validTargetPageIds.includes(existingId),
        );

        if (backlinksToAdd.length > 0) {
          const newBacklinks = backlinksToAdd.map((targetPageId) => ({
            sourcePageId: pageId,
            targetPageId: targetPageId,
            workspaceId: workspaceId,
          }));

          await this.backlinkRepo.insertBacklink(newBacklinks, trx);
          this.logger.debug(
            `Added ${newBacklinks.length} new backlinks to ${pageId}`,
          );
        }

        if (backlinksToRemove.length > 0) {
          await this.db
            .deleteFrom('backlinks')
            .where('sourcePageId', '=', pageId)
            .where('targetPageId', 'in', backlinksToRemove)
            .execute();

          this.logger.debug(
            `Removed ${backlinksToRemove.length} outdated backlinks from ${pageId}.`,
          );
        }
      });
    } catch (err) {
      this.logger.error(`Error processing backlinks job: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
