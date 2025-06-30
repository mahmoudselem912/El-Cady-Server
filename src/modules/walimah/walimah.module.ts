import { Module } from '@nestjs/common';
import { WalimahController } from './walimah.controller';
import { WalimahService } from './walimah.service';

@Module({
  controllers: [WalimahController],
  providers: [WalimahService]
})
export class WalimahModule {}
