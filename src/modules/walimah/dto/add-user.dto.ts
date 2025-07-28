import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AddUserDto {
	@ApiProperty({ example: 'name' })
	@IsString()
	@IsNotEmpty()
	name: string;

	@ApiProperty({ example: 'number' })
	@IsString()
	@IsNotEmpty()
	number: string;

	@ApiProperty({ example: 'city', required: false })
	@IsString()
	@IsOptional()
	city: string;

	@ApiProperty({ example: 'email', required: false })
	@IsString()
	@IsOptional()
	email: string;

	@ApiProperty({ example: 'code', required: false })
	@IsString()
	@IsOptional()
	code: string;

	@ApiProperty({ type: 'string', format: 'binary' })
	file: any;
}
