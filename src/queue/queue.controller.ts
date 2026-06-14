// src/queue/queue.controller.ts
import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { QueueService } from './queue.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Queue')
@ApiBearerAuth('access-token')
@Controller('admin/queue')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Get('metrics/:queueName')
  getQueueMetrics(@Param('queueName') queueName: string) {
    return this.queueService.getQueueMetrics(queueName);
  }

  @Get('job/:queueName/:jobId')
  getJobStatus(
    @Param('queueName') queueName: string,
    @Param('jobId') jobId: string,
  ) {
    return this.queueService.getJobStatus(queueName, jobId);
  }

  @Post('retry/:queueName/:jobId')
  retryJob(
    @Param('queueName') queueName: string,
    @Param('jobId') jobId: string,
  ) {
    return this.queueService.retryFailedJob(queueName, jobId);
  }

  @Post('clean/:queueName')
  cleanJobs(@Param('queueName') queueName: string) {
    return this.queueService.cleanOldJobs(queueName, 24);
  }

  // Lógica movida para o service — controller só delega
  @Get('all-metrics')
  getAllMetrics() {
    return this.queueService.getAllMetrics();
  }
}