import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyOtpDto {
	@ApiProperty({ example: 'email@gmail.com' })
	@IsString()
	@IsNotEmpty()
	email: string;

	@ApiProperty({ example: 'email@gmail.com' })
	@IsString()
	@IsNotEmpty()
	otp: string;
}
