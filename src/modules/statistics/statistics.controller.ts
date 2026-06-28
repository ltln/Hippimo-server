import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { StatisticsService } from './statistics.service';
import { UserId } from 'src/core/common/decorators/user-id.decorator';
import { HomeStatisticsQueryDto } from './dto/home-statistics-query.dto';
import { HomeStatistics } from './entities/home-statistics.entity';

@ApiTags('Statistics')
@ApiBearerAuth('access-token')
@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('home')
  @ApiOperation({
    summary: 'Get home dashboard statistics for current user',
    description:
      'Returns wallet balances, period income/expense (with previous period comparison), expense breakdown by category, and budget alerts. Defaults to the current month when no period is provided.',
  })
  @ApiOkResponse({
    description: 'Home statistics returned successfully.',
    type: HomeStatistics,
  })
  @ApiBadRequestResponse({ description: 'Invalid period query filters.' })
  getHomeStatistics(
    @UserId() userId: string,
    @Query() query: HomeStatisticsQueryDto,
  ) {
    return this.statisticsService.getHomeStatistics(userId, query);
  }
}
