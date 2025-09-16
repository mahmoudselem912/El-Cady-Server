import { Module } from '@nestjs/common';
import { GentoController } from './gento.controller';
import { GentoService } from './gento.service';

@Module({
  controllers: [GentoController],
  providers: [GentoService]
})
export class GentoModule {}
