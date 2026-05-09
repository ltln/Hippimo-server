import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UserId } from 'src/core/common/decorators/user-id.decorator';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

const uuidPipe = new ParseUUIDPipe({ version: '4' });

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a user placeholder' })
  @ApiOkResponse({ description: 'Placeholder response' })
  create() {
    return this.usersService.create();
  }

  @Get()
  @ApiOperation({ summary: 'List users placeholder' })
  @ApiOkResponse({ description: 'Placeholder response' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiOkResponse({ description: 'Current user response' })
  findMe(@UserId() userId: string) {
    return this.usersService.findOne(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by id placeholder' })
  @ApiOkResponse({ description: 'Placeholder response' })
  findOne(@Param('id', uuidPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user by id placeholder' })
  @ApiOkResponse({ description: 'Placeholder response' })
  update(@Param('id', uuidPipe) id: string) {
    return this.usersService.update(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user by id placeholder' })
  @ApiOkResponse({ description: 'Placeholder response' })
  remove(@Param('id', uuidPipe) id: string) {
    return this.usersService.remove(id);
  }
}
