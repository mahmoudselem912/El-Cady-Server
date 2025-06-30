import { Catch, ArgumentsHost } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { handleException } from './error.handler';

@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
	catch(exception: unknown, host: ArgumentsHost) {
		const request = host.switchToHttp().getRequest();
		const data = {
			body: request.body,
			params: request.params,
			query: request.query,
			headers: request.headers,
			cookies: request.cookies,
			user: request.user,
			ip: request.ip,
			hostname: request.hostname,
			url: request.url,
			method: request.method,
			originalUrl: request.originalUrl,
		};
		super.catch(exception, host);
		const error = exception as Error;
		handleException(error, { data });
	}
}
