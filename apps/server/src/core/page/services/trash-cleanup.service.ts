import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';
import { AttachmentRepo } from '@docmost/db/repos/attachment/attachment.repo';

@Injectable()
export class TrashCleanupService {
  private readonly logger = new Logger(TrashCleanupService.name);
  private readonly RETENTION_DAYS = 30;

  constructor(
    @InjectKysely() private readonly db: KyselyDB,
    private readonly attachmentRepo: AttachmentRepo,
  ) {}

  @Interval('trash-cleanup', 24 * 60 * 60 * 1000) // every 24 hours
  async cleanupOldTrash() {
    try {
      this.logger.log('Starting trash cleanup job');

      const retentionDate = new Date();
      retentionDate.setDate(retentionDate.getDate() - this.RETENTION_DAYS);

      // Get all pages that were deleted more than 30 days ago
      const oldDeletedPages = await this.db
        .selectFrom('pages')
        .select(['id', 'spaceId', 'workspaceId'])
        .where('deletedAt', '<', retentionDate)
        .execute();

      if (oldDeletedPages.length === 0) {
        this.logger.debug('No old trash items to clean up');
        return;
      }

      this.logger.debug(`Found ${oldDeletedPages.length} pages to clean up`);

      // Process each page
      for (const page of oldDeletedPages) {
        try {
          await this.cleanupPage(page.id);
        } catch (error) {
          this.logger.error(
            `Failed to cleanup page ${page.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            error instanceof Error ? error.stack : undefined,
          );
        }
      }

      this.logger.debug('Trash cleanup job completed');
    } catch (error) {
      this.logger.error(
        'Trash cleanup job failed',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async cleanupPage(pageId: string) {
    // Get all descendants using recursive CTE (including the page itself)
    const descendants = await this.db
      .withRecursive('page_descendants', (db) =>
        db
          .selectFrom('pages')
          .select(['id'])
          .where('id', '=', pageId)
          .unionAll((exp) =>
            exp
              .selectFrom('pages as p')
              .select(['p.id'])
              .innerJoin('page_descendants as pd', 'pd.id', 'p.parentPageId'),
          ),
      )
      .selectFrom('page_descendants')
      .selectAll()
      .execute();

    const pageIds = descendants.map((d) => d.id);

    this.logger.debug(
      `Cleaning up page ${pageId} with ${pageIds.length - 1} descendants`,
    );

    try {
      if (pageIds.length > 0) {
        await this.attachmentRepo.deleteAttachmentsByPageIds(pageIds);
        await this.db.deleteFrom('pages').where('id', 'in', pageIds).execute();
      }
    } catch (error) {
      // Log but don't throw - pages might have been deleted by another node
      this.logger.warn(
        `Error deleting pages, they may have been already deleted: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
