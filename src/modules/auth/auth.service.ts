import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { handleException } from 'src/utils/error.handler';
import { CustomBadRequestException, CustomNotFoundException } from 'src/utils/custom.exceptions';
import { comparePassword } from 'src/utils/bcrypt';
import { ElcadyUserLoginDto, UserLoginDto } from './dto';

export type userRole = 'Admin' | 'User';

@Injectable()
export class AuthService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly jwt: JwtService,
		private readonly config: ConfigService,
	) {}

	private async signJwtToken(userId: number, email: string, userRole: userRole): Promise<string> {
		try {
			const payload = {
				sub: userId,
				email,
				role: userRole,
			};

			const accessTokenOptions: JwtSignOptions = {
				expiresIn: '90d',
				algorithm: 'HS256',
				secret: this.config.get('JWT_SECRET'),
			};

			const accessToken = await this.jwt.signAsync(payload, accessTokenOptions);
			return accessToken;
		} catch (error) {
			handleException(error, { userId, email, userRole });
		}
	}

	async loginClientUser(dto: UserLoginDto) {
		try {
			const ExistingUser = await this.prisma.walimah_dashboard_user.findFirst({
				where: {
					name: dto.name,
				},
			});

			if (!ExistingUser) {
				throw new CustomNotFoundException('INVALID_EMAIL');
			}

			if (!(await comparePassword(dto.password, ExistingUser.password))) {
				throw new CustomBadRequestException('Invalid password!');
			}

			const token = await this.signJwtToken(ExistingUser.id, ExistingUser.name, 'User');
			const userName = ExistingUser.name;
			return { token, userName };
		} catch (error) {
			handleException(error, dto);
		}
	}

	async loginFormationUser(dto: ElcadyUserLoginDto) {
		try {
			const ExistingAdmin = await this.prisma.elCady_admin.findFirst({
				where: {
					email: dto.email,
				},
			});

			if (!ExistingAdmin) {
				throw new CustomNotFoundException('INVALID_USER');
			}

			if (!(await comparePassword(dto.password, ExistingAdmin.password))) {
				throw new CustomBadRequestException('Invalid password!');
			}

			const token = await this.signJwtToken(ExistingAdmin.id, ExistingAdmin.adminName, 'Admin');
			const userName = ExistingAdmin.adminName;
			return { token, userName };
		} catch (error) {
			handleException(error, dto);
		}
	}

	async verifyToken(token: string) {
		try {
			return this.jwt.verify(token); // will throw if invalid/expired
		} catch (error) {
			handleException(error, {});
		}
	}
}
