import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class AddCouponDto {
	@ApiProperty({ example: 'Code' })
	@IsString()
	@IsNotEmpty()
	code: string;

	@ApiProperty({ example: 'Code' })
	@IsString()
	@IsNotEmpty()
	percentage: string;

	@ApiProperty({ example: '2025-01-01' })
	@IsDateString()
	@IsNotEmpty()
	startDate: Date;

	@ApiProperty({ example: '2025-01-01' })
	@IsDateString()
	@IsNotEmpty()
	endDate: Date;
}
