import { Body, Controller, Post, Res } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { successfulResponse } from 'src/utils/response.handler';
import { ApiTags } from '@nestjs/swagger';
import { UserLoginDto, ElcadyUserLoginDto } from './dto';
import { FastifyReply } from 'fastify';

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@Post('login-client-user')
	async LoginClientUser(@Body() dto: UserLoginDto, @Res({ passthrough: true }) reply: FastifyReply) {
		const data = await this.authService.loginClientUser(dto);

		reply.setCookie('auth_token', data.token, {
			httpOnly: true,
			secure: true, // true in production with HTTPS
			path: '/', // cookie valid for whole domain
			maxAge: 60 * 60 * 24, // 1 day in seconds
			sameSite: 'none',
		});

		return successfulResponse('Success');
	}

	@Post('login-formation-user')
	async LoginFormationUser(@Body() dto: ElcadyUserLoginDto, @Res({ passthrough: true }) reply: FastifyReply) {
		const data = await this.authService.loginFormationUser(dto);
		reply.setCookie('auth_token', data.token, {
			httpOnly: true,
			secure: true, // true in production with HTTPS
			path: '/', // cookie valid for whole domain
			maxAge: 60 * 60 * 24, // 1 day in seconds
			sameSite: 'none',
		});
		return successfulResponse("success");
	}
}
