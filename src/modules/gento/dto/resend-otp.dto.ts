import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ResendOtpDto {
	@ApiProperty({ example: 'email@gmail.com' })
	@IsString()
	@IsNotEmpty()
	email: string;
}
