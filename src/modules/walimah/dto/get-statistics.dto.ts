import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class GetStatisticsDto {
	@ApiProperty({ example: 1, required: false })
	@IsOptional()
	@Transform(({ value }) => parseInt(value))
	@IsNumber()
	page?: number;

	@ApiProperty({ example: 10, required: false })
	@IsOptional()
	@Transform(({ value }) => parseInt(value))
	@IsNumber()
	pageItemsCount?: number;

	@ApiProperty({ example: 'john', required: false })
	@IsOptional()
	@IsString()
	search?: string;
}
