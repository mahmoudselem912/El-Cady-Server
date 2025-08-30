import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CoreUserEnum, CORE_USER_TYPE_KEY } from '../../decorator';
import { CustomForbiddenException } from 'src/utils/custom.exceptions';
import { walimah_dashboard_user, ElCady_admin } from '@prisma/client';

@Injectable()
export class AuthorizeCoreUsersGuard implements CanActivate {
	constructor(private readonly reflector: Reflector) {}

	canActivate(context: ExecutionContext): boolean {
		const request = context.switchToHttp().getRequest();
		const user = request.user as walimah_dashboard_user | ElCady_admin | null;
    
		if (!user) {
			throw new CustomForbiddenException('No authenticated user found');
		}

		const allowedUserTypes = this.reflector.getAllAndOverride<CoreUserEnum[]>(CORE_USER_TYPE_KEY, [
			context.getHandler(),
			context.getClass(),
		]);

		if (!allowedUserTypes || allowedUserTypes.length === 0) {
			throw new CustomForbiddenException('No core user type specified for this route');
		}

		const isCady = (user as any).adminName;
		const isClient = (user as any).name;

		const userType: CoreUserEnum | null = isCady
			? CoreUserEnum.ELCADY
			: isClient
				? CoreUserEnum.CLIENT
				: null;

		if (!userType || !allowedUserTypes.includes(userType)) {
			throw new CustomForbiddenException(
				`User type "${userType ?? 'UNKNOWN'}" is not allowed to access this route`,
			);
		}

		return true;
	}
}
