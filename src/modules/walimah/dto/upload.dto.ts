import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UploadDto {
	@ApiProperty({ example: 1 })
	@IsNumber()
	@Transform(({ value }) => parseInt(value))
	user_id: number;

	@ApiProperty({ type: 'string', format: 'binary' })
	file: any;

	@ApiProperty({ example: 'name', required: false })
	@IsString()
	@IsOptional()
	file_name: string;
}
