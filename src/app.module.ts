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
import { GentoModule } from './modules/gento/gento.module';
import { MailModule } from './modules/mail/mail.module';
import { ExcelModule } from './modules/excel/excel.module';

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
		GentoModule,
		MailModule,
		ExcelModule,
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
