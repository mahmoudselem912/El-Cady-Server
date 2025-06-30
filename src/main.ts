
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import multipart from '@fastify/multipart';
import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import { ValidationPipe } from '@nestjs/common/pipes';
import { NextFunction } from 'express';
import * as path from 'path';
import fastifyHelmet from '@fastify/helmet';
import fastifyCsrf from '@fastify/csrf-protection';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { HttpAdapterHost } from '@nestjs/core';
import { AllExceptionsFilter } from './utils/all-exceptions.filter';
import * as cors from 'cors';

async function bootstrap() {
	const logger: Logger = new Logger('🚀 ' + 'App');
	setTimeout(() => {
		logger.log('App is bootstrapping...');
		logger.log('Time: ' + new Date());
	}, 2500);

	const config = new ConfigService();
	let httpsOptions = {
		key: fs.readFileSync(config.get('SSL_KEY_PATH')),
		cert: fs.readFileSync(config.get('SSL_CERT_PATH')),
	};
	if (config.get('ENABLE_HTTPS') === 'false') {
		httpsOptions = { key: null, cert: null };
	}
	const FastifyAdapterOptions = {
		logger: false,
		maxParamLength: 1000,
		https: httpsOptions,
		bodyLimit: 1024 * 1024 * 15 /* 15 MB*/,
	};
	if (config.get('ENABLE_HTTPS') === 'false') delete FastifyAdapterOptions.https;

	const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(FastifyAdapterOptions), {
		httpsOptions,
	});

	// app.setGlobalPrefix('api');

	if (config.get('ENABLE_SWAGGER') === 'true') {
		const swaggerConfig = new DocumentBuilder()
			.setTitle(`${config.get('NODE_ENV') === 'production' ? 'Prod' : 'Dev'} Events APIs From ElCady Company`)
			.setDescription(
				'RESTful APIs for Events system provided by El Cady Company. These APIs enable interactions with various functionalities, including user management, data retrieval, and more.',
			)
			.setVersion('1.0.0')
			.addBearerAuth()
			.addGlobalParameters()
			.build();

		const document = SwaggerModule.createDocument(app, swaggerConfig);
		SwaggerModule.setup('/7MryyCi5Sd/swagger-docs', app, document, {
			swaggerOptions: {
				docExpansion: 'none',
			},
		});
	}
	app.useGlobalPipes(
		new ValidationPipe({
			transform: true,
		}),
	);
	app.enableCors({
		origin: '*',
	});
	app.use(
		cors({
			origin: '*',
		}),
	);

	let minuteCounter = 0,
		maxMinuteCounter = 0,
		hourCounter = 0,
		dayCounter = 0;

	const requestCounterMiddleware = (req: Request, res: Response, next: NextFunction) => {
		minuteCounter++;
		hourCounter++;
		dayCounter++;
		next();
	};

	app.use(requestCounterMiddleware);

	setInterval(() => {
		if (minuteCounter > maxMinuteCounter) {
			maxMinuteCounter = minuteCounter;
		}
		if (minuteCounter > 0)
			logger.log(`Requests in the last minute: ${minuteCounter} r/m , Max: ${maxMinuteCounter} r/m`);
		minuteCounter = 0;
	}, 60000);

	setInterval(() => {
		logger.log(`Requests in the last hour: ${hourCounter} r/h`);
		hourCounter = 0;
	}, 3600000);

	setInterval(() => {
		logger.log(`Requests in the last day: ${dayCounter} r/d`);
		dayCounter = 0;
	}, 86400000);

	app.register(multipart as any, {
		limits: {
			fileSize: 1024 * 1024 * 15 /* 15 MB*/,
		},
		onError: function (error, _, reply) {
			logger.error('Error : In app.register() for limits: 15 MB');
			logger.error('Error : ', error);
			if (error.code === 'LIMIT_FILE_SIZE') {
				reply.code(412).send('File size too large must be less than 15MB');
			} else {
				reply.code(500).send((error as Error).message);
			}
		},
	});

	app.register(require('@fastify/static'), {
		root: path.join(process.cwd(), '/uploads'),
		acceptRanges: true,
	});

	// await app.register(helmet, {
	// 	contentSecurityPolicy: false,
	// 	crossOriginResourcePolicy: { policy: 'cross-origin' },
	// });

	await app.register(fastifyHelmet, {
		contentSecurityPolicy: false, // Disable CSP or configure it as per your needs
		crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow cross-origin
		hsts: {
			maxAge: 31536000, // 1 year in seconds
			includeSubDomains: true, // Apply HSTS to all subdomains
			preload: true, // Allow domain to be preloaded in browsers
		},
	});

	await app.register(fastifyCsrf);

	app.useWebSocketAdapter(new IoAdapter(app));

	const { httpAdapter } = app.get(HttpAdapterHost);
	app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));

	process.on('uncaughtException', (error, origin) => {
		logger.error('__________________________Uncaught Exception__________________________');
		logger.error('Uncaught Exception at: ', error, 'origin:', origin);
		const logEntry = `Uncaught Exception at: ${error.stack} origin: ${origin}`;
		logger.error({ proccessCWD: process.cwd() });
		const logFolderPath = path.join(process.cwd(), '/logs');

		const folderExist = fs.existsSync(logFolderPath);
		if (!folderExist) {
			fs.mkdirSync(logFolderPath);
		}
		const logFilePath = path.join(logFolderPath, 'uncaughtException.txt');
		fs.appendFileSync(logFilePath, logEntry + '\n');
	});

	process.on('unhandledRejection', async (reason, promise) => {
		logger.error('__________________________Unhandled Rejection__________________________');
		logger.error('Unhandled Rejection at: ', promise, 'reason:', reason);
		const logEntry = `Unhandled Rejection at: ${JSON.stringify(promise)} و reason: ${reason}`;
		const logFolderPath = path.join(process.cwd(), 'logs');
		const folderExist = fs.existsSync(logFolderPath);
		if (!folderExist) {
			fs.mkdirSync(logFolderPath);
		}
		const logFilePath = path.join(logFolderPath, 'unhandledRejection.txt');
		fs.appendFileSync(logFilePath, logEntry + '\n');
	});

	process.on('exit', (code) => {
		logger.error('exit code:', code);
	});

	await app.listen(4000, '0.0.0.0');
}
bootstrap();
