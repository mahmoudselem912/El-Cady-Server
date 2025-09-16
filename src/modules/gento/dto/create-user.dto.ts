import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateUserDto {
	@ApiProperty({ example: 'email@gmail.com' })
	@IsString()
	@IsNotEmpty()
	firstName: string;

	@ApiProperty({ example: 'email@gmail.com' })
	@IsString()
	@IsNotEmpty()
	lastName: string;

	@ApiProperty({ example: 'email@gmail.com' })
	@IsString()
	@IsNotEmpty()
	email: string;
}
