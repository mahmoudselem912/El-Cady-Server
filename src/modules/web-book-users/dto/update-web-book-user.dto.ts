import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateWebBookUserDto {
	@ApiProperty({ example: 1 })
	@IsNumber()
	@Transform(({ value }) => parseInt(value))
	user_id: number;

	@ApiProperty({ example: 'name', required: false })
	@IsString()
	@IsOptional()
	name: string;

	@ApiProperty({ example: 'text', required: false })
	@IsString()
	@IsOptional()
	text: string;
}
