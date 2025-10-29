import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class ExportWalimahUsersDto {
	@ApiProperty({ example: '2025-09-09', required: false })
	@IsDateString()
	@IsOptional()
	fromDate: Date;

	@ApiProperty({ example: '2025-09-09', required: false })
	@IsDateString()
	@IsOptional()
	toDate: Date;
}
