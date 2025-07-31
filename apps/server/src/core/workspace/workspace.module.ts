import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { WorkspaceService } from './services/workspace.service';
import { WorkspaceController } from './controllers/workspace.controller';
import { SpaceModule } from '../space/space.module';
import { WorkspaceInvitationService } from './services/workspace-invitation.service';
import { TokenModule } from '../auth/token.module';

@Module({
  imports: [EventEmitterModule.forRoot(), SpaceModule, TokenModule],
  controllers: [WorkspaceController],
  providers: [WorkspaceService, WorkspaceInvitationService],
  exports: [WorkspaceService],
})
export class WorkspaceModule {}
