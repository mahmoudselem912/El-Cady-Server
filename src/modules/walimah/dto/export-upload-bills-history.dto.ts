import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty } from 'class-validator';

export class ExportUploadBillsHistoryDto {
	@ApiProperty({ example: '2025-10-15' })
	@IsDateString()
	@IsNotEmpty()
	from: Date;

	@ApiProperty({ example: '2025-10-15' })
	@IsDateString()
	@IsNotEmpty()
	to: Date;
}
