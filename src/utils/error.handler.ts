import {
	BadRequestException,
	HttpException,
	InternalServerErrorException,
	UnauthorizedException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError, PrismaClientUnknownRequestError } from '@prisma/client/runtime/library';

import {
	CustomBadRequestException,
	CustomForbiddenException,
	CustomHttpException,
	CustomNotFoundException,
	UniqueConstraintViolationException,
} from './custom.exceptions';

export function handleException(error: Error, data: any = undefined) {
	const genericMessage = 'Something went wrong, please contact deep blue support!';

	if (error instanceof PrismaClientKnownRequestError) {
		if (error.code === 'P2002') {
			throw new UniqueConstraintViolationException(
				'Entity with this unique constraint already exists! Please contact deep blue support!',
			);
		}
		throw new BadRequestException("Can't perform this action! Please contact deep blue support!");
	}
	if (error instanceof HttpException) {
		throw error;
	}
	if (error instanceof PrismaClientUnknownRequestError) {
		console.error('PrismaClientUnknownRequestError', error);
		throw new BadRequestException(genericMessage);
	}
	if (error instanceof UnauthorizedException) {
		throw new CustomBadRequestException('You Are not Authorized to perform this action!');
	}
	if (
		error instanceof CustomBadRequestException ||
		error instanceof CustomForbiddenException ||
		error instanceof CustomNotFoundException ||
		error instanceof CustomHttpException
	) {
		throw error;
	}
	console.error({ errorMessage: error.message });
	console.error({ errorName: error.name });
	console.error({ errorStack: error.stack });
	console.error({ errorData: data });

	throw new InternalServerErrorException(genericMessage);
}
