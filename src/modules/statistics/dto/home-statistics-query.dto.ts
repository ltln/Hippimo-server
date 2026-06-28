import { IsDateString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class HomeStatisticsQueryDto {
  @ApiPropertyOptional({
    description:
      'Start date (inclusive) of the statistics period. Defaults to the first day of the current month.',
    example: '2026-06-01',
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description:
      'End date (inclusive) of the statistics period. Defaults to the current date.',
    example: '2026-06-30',
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  to?: string;
}
