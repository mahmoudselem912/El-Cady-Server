import { ApiProperty } from '@nestjs/swagger';
import { CouponCompany, CouponType } from '@prisma/client';
import { IsDateString, IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class AddCouponDto {
	@ApiProperty({ example: 'Code' })
	@IsString()
	@IsNotEmpty()
	code: string;

	@ApiProperty({ example: CouponCompany.Noon })
	@IsEnum(CouponCompany)
	company: CouponCompany;

	@ApiProperty({ example: CouponType.Percentage })
	@IsEnum(CouponType)
	type: CouponType;

	@ApiProperty({ example: 'Code' })
	@IsString()
	@IsNotEmpty()
	value: string;

	@ApiProperty({ example: '2025-01-01' })
	@IsDateString()
	@IsNotEmpty()
	startDate: Date;

	@ApiProperty({ example: '2025-01-01' })
	@IsDateString()
	@IsNotEmpty()
	endDate: Date;
}
