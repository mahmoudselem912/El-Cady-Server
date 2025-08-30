import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaService } from './modules/prisma/prisma.service';
import { PrismaModule } from './modules/prisma/prisma.module';
import { WalimahModule } from './modules/walimah/walimah.module';
import { ClientsModule } from './modules/clients/clients.module';
import { WebBookUsersModule } from './modules/web-book-users/web-book-users.module';
import { CountryModule } from './modules/country/country.module';
import { AuthModule } from './modules/auth/auth.module';

const ENV = process.env.NODE_ENV;

@Module({
	imports: [
		ConfigModule.forRoot({
			envFilePath: ENV === 'production' ? '.env' : `.env.${ENV}`,
			isGlobal: true,
		}),
		ThrottlerModule.forRoot([
			{
				ttl: 60 * 1000,
				limit: 1000,
			},
		]),
		PrismaModule,
		WalimahModule,
		ClientsModule,
		AuthModule,
		WebBookUsersModule,
		CountryModule,
	],
	controllers: [],
	providers: [
		{
			provide: APP_GUARD,
			useClass: ThrottlerGuard,
		},
		PrismaService,
	],
})
export class AppModule {}
