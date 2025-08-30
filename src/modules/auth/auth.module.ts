import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { JwtStrategy } from './strategy';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [JwtModule.register({}),
  ThrottlerModule.forRoot([
    {
      ttl: 60,
      limit: 10,
    },
  ]),],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },]
})
export class AuthModule { }
