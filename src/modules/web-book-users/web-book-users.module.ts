import { Module } from '@nestjs/common';
import { WebBookUsersController } from './web-book-users.controller';
import { WebBookUsersService } from './web-book-users.service';

@Module({
  controllers: [WebBookUsersController],
  providers: [WebBookUsersService]
})
export class WebBookUsersModule {}
