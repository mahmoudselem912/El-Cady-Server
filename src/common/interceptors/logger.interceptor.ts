import { CallHandler, ExecutionContext, Injectable, NestInterceptor, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
	private readonly logger = new Logger('HTTP');

	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		const request = context.switchToHttp().getRequest();
		const response = context.switchToHttp().getResponse();

		const { method, url, body, user, statusMessage, params, query } = request;

		// Log request details
		this.logger.log(`Incoming Request - ${method} ${url}`);

		const now = Date.now();

		return next.handle().pipe(
			tap(() => {
				// Log response details and response time
				const responseTime = Date.now() - now;
				if (response.statusCode >= 400) {
					this.logger.error(
						`Outgoing Response - ${method} ${url} - Status: ${response.statusCode} - Response Time: ${responseTime}ms`,
					);
					this.logger.verbose({ body });
					this.logger.verbose({ user });
					this.logger.verbose({ statusMessage });
					this.logger.verbose({ params });
					this.logger.verbose({ query });
					this.logger.verbose({ response });
				} else {
					this.logger.log(
						`Outgoing Response - ${method} ${url} - Status: ${response.statusCode} - Response Time: ${responseTime}ms`,
					);
				}
			}),
		);
	}
}
