import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

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

	@ApiProperty({ example: 'sharedCount', required: false, enum: ['sharedCount', 'couponsCount', 'billsCount'] })
	@IsOptional()
	@IsString()
	sortBy?: 'sharedCount' | 'couponsCount' | 'billsCount';

	@ApiProperty({ example: 'desc', required: false, enum: ['asc', 'desc'] })
	@IsOptional()
	@IsString()
	sortOrder?: 'asc' | 'desc';

	@ApiProperty({ example: '2025-09-09', required: false })
	@IsDateString()
	@IsOptional()
	fromDate: Date;

	@ApiProperty({ example: '2025-09-09', required: false })
	@IsDateString()
	@IsOptional()
	toDate: Date;
}
