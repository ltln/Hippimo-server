import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './core/common/decorators/public.decorator';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Health check' })
  @ApiOkResponse({ description: 'Application is reachable' })
  getHello(): string {
    return this.appService.getHello();
  }
}
