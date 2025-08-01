import * as path from 'path';
import {
  Global,
  Logger,
  Module,
  OnApplicationBootstrap,
  BeforeApplicationShutdown,
} from '@nestjs/common';
import { InjectKysely, KyselyModule } from 'nestjs-kysely';
import { EnvironmentService } from '../integrations/environment/environment.service';
import { CamelCasePlugin, LogEvent, sql, Kysely } from 'kysely';
import { PGlite } from '@electric-sql/pglite';
import { Dialect, Driver, QueryCompiler, DatabaseIntrospector } from 'kysely';
import { DefaultQueryCompiler } from 'kysely';
import { GroupRepo } from '@docmost/db/repos/group/group.repo';
import { WorkspaceRepo } from '@docmost/db/repos/workspace/workspace.repo';
import { UserRepo } from '@docmost/db/repos/user/user.repo';
import { GroupUserRepo } from '@docmost/db/repos/group/group-user.repo';
import { SpaceRepo } from '@docmost/db/repos/space/space.repo';
import { SpaceMemberRepo } from '@docmost/db/repos/space/space-member.repo';
import { PageRepo } from './repos/page/page.repo';
import { CommentRepo } from './repos/comment/comment.repo';
import { PageHistoryRepo } from './repos/page/page-history.repo';
import { AttachmentRepo } from './repos/attachment/attachment.repo';
import { KyselyDB } from '@docmost/db/types/kysely.types';
import * as process from 'node:process';
import { MigrationService } from '@docmost/db/services/migration.service';
import { UserTokenRepo } from './repos/user-token/user-token.repo';
import { BacklinkRepo } from '@docmost/db/repos/backlink/backlink.repo';
import { ShareRepo } from '@docmost/db/repos/share/share.repo';

@Global()
@Module({
  imports: [
    KyselyModule.forRootAsync({
      imports: [],
      inject: [EnvironmentService],
      useFactory: (environmentService: EnvironmentService) => ({
        dialect: {
          createAdapter() {
            return {
              supportsCreateIfNotExists: false,
              supportsTransactionalDdl: false,
              supportsReturning: true,
              async acquireMigrationLock() {},
              async releaseMigrationLock() {}
            };
          },
          createDriver() {
            const dbPath = path.join(__dirname, '../../../server/data/db.pglite');
            const pglite = new PGlite(dbPath);
            return {
              async init() {},
              async acquireConnection() {
                return {
                  connection: pglite,
                  query: pglite.query.bind(pglite),
                  execute: pglite.exec.bind(pglite),
                  executeQuery: async <R>(query) => {
                    const result = await pglite.query<R>(query.sql, query.parameters as any[]);
                    return {
                      rows: result.rows as R[],
                      numAffectedRows: result.rows.length ? BigInt(result.rows.length) : undefined
                    };
                  },
                  streamQuery: async function* <R>() {
                    throw new Error('Streaming not supported by PGlite');
                    yield { rows: [] as R[] }; // This line is unreachable but satisfies type checker
                  }
                };
              },
              async beginTransaction() {},
              async commitTransaction() {},
              async rollbackTransaction() {},
              async releaseConnection() {},
              async destroy() {
                await pglite.close();
              }
            };
          },
          createQueryCompiler() {
            return new DefaultQueryCompiler();
          },
          createIntrospector(db: Kysely<any>) {
            return {
              async getSchemas() { return []; },
              async getTables() { return []; },
              async getMetadata() { return null; }
            };
          }
        },
        plugins: [new CamelCasePlugin()],
        log: (event: LogEvent) => {
          if (environmentService.getNodeEnv() !== 'development') return;
          const logger = new Logger(DatabaseModule.name);
          if (event.level) {
            if (process.env.DEBUG_DB?.toLowerCase() === 'true') {
              logger.debug(event.query.sql);
              logger.debug('query time: ' + event.queryDurationMillis + ' ms');
              //if (event.query.parameters.length > 0) {
              // logger.debug('parameters: ' + event.query.parameters);
              //}
            }
          }
        },
      }),
    }),
  ],
  providers: [
    MigrationService,
    WorkspaceRepo,
    UserRepo,
    GroupRepo,
    GroupUserRepo,
    SpaceRepo,
    SpaceMemberRepo,
    PageRepo,
    PageHistoryRepo,
    CommentRepo,
    AttachmentRepo,
    UserTokenRepo,
    BacklinkRepo,
    ShareRepo
  ],
  exports: [
    WorkspaceRepo,
    UserRepo,
    GroupRepo,
    GroupUserRepo,
    SpaceRepo,
    SpaceMemberRepo,
    PageRepo,
    PageHistoryRepo,
    CommentRepo,
    AttachmentRepo,
    UserTokenRepo,
    BacklinkRepo,
    ShareRepo
  ],
})
export class DatabaseModule
  implements OnApplicationBootstrap, BeforeApplicationShutdown
{
  private readonly logger = new Logger(DatabaseModule.name);

  constructor(
    @InjectKysely() private readonly db: KyselyDB,
    private readonly migrationService: MigrationService,
    private readonly environmentService: EnvironmentService,
  ) {}

  async onApplicationBootstrap() {
    await this.establishConnection();

    if (this.environmentService.getNodeEnv() === 'production') {
      await this.migrationService.migrateToLatest();
    }
  }

  async beforeApplicationShutdown(): Promise<void> {
    if (this.db) {
      await this.db.destroy();
    }
  }

  async establishConnection() {
    const retryAttempts = 15;
    const retryDelay = 3000;

    this.logger.log('Establishing database connection');
    for (let i = 0; i < retryAttempts; i++) {
      try {
        await sql`SELECT 1=1`.execute(this.db);
        this.logger.log('Database connection successful');
        break;
      } catch (err) {
        if (err['errors']) {
          this.logger.error(err['errors'][0]);
        } else {
          this.logger.error(err);
        }

        if (i < retryAttempts - 1) {
          this.logger.log(
            `Retrying [${i + 1}/${retryAttempts}] in ${retryDelay / 1000} seconds`,
          );
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        } else {
          this.logger.error(
            `Failed to connect to database after ${retryAttempts} attempts. Exiting...`,
          );
          process.exit(1);
        }
      }
    }
  }
}
