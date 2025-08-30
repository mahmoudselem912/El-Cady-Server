import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { userRole } from '../auth.service';
import { ElCady_admin, walimah_dashboard_user } from '@prisma/client';
import { FastifyRequest } from 'fastify';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
	constructor(
		config: ConfigService,
		private readonly prisma: PrismaService,
	) {
		super({
			jwtFromRequest: (req: FastifyRequest) => req.cookies?.auth_token,
			ignoreExpiration: false,
			secretOrKey: config.get('JWT_SECRET'),
		});
	}

	async validate(payload: { sub: number; email: string; role: userRole; iat: number; exp: number }) {
		try {
			let user: ElCady_admin | walimah_dashboard_user;
			if (payload.role === 'User') {
				user = await this.prisma.walimah_dashboard_user.findUnique({
					where: {
						id: payload.sub,
					},
					// include: { client: true },
				});
				delete user?.password;
			} else {
				user = await this.prisma.elCady_admin.findUnique({
					where: {
						id: payload.sub,
					},
				});
				delete user?.password;
			}
			return user;
		} catch (error) {
			throw new InternalServerErrorException('validate jwt error', error.message);
		}
	}
}
