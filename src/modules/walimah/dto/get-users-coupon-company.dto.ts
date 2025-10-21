import { ApiProperty } from '@nestjs/swagger';
import { CouponCompany } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class GetUsersByCouponCompany {
	@ApiProperty({ example: CouponCompany.Noon })
	@IsEnum(CouponCompany)
	company: CouponCompany;
}
