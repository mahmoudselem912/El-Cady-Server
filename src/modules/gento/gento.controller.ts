import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GentoService } from './gento.service';
import { successfulResponse } from 'src/utils/response.handler';
import { CreateUserDto, ResendOtpDto, VerifyOtpDto } from './dto';

@Controller('gento')
@ApiTags('Gento')
export class GentoController {
	constructor(private readonly gentoService: GentoService) {}

	@Post('create-user')
	async CreateUser(@Body() dto: CreateUserDto) {
		const data = await this.gentoService.createUser(dto);
		return successfulResponse(data);
	}

	@Post('verify-otp')
	async VerifyOtp(@Body() dto: VerifyOtpDto) {
		const data = await this.gentoService.verifyOtp(dto);
		return successfulResponse(data);
	}

	@Post('resend-otp')
	async ResendOtp(@Body() dto: ResendOtpDto) {
		const data = await this.gentoService.resendOtp(dto);
		return successfulResponse(data);
	}

    @Get('get-all-gento-users')
    async GetAllGentoUsers() {
        const data = await this.gentoService.getAllGentoUsers()
        return successfulResponse(data)
    }
}
