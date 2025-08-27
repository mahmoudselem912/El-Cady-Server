import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class Prize {
	@ApiProperty({ example: 'name' })
	@IsString()
	@IsNotEmpty()
	name: string;

	@ApiProperty({ example: 'value' })
	@IsString()
	@IsNotEmpty()
	value: string;

	@ApiProperty({ example: 1 })
	@IsNumber()
	@Transform(({ value }) => parseInt(value))
	winners: number;
}

export class AddDrawDto {
	@ApiProperty({ example: 'title' })
	@IsString()
	@IsNotEmpty()
	title: string;

	@ApiProperty({ example: '2025-01-01' })
	@IsDateString()
	@IsNotEmpty()
	startDate: Date;

	@ApiProperty({ example: '2025-01-01' })
	@IsDateString()
	@IsNotEmpty()
	endDate: Date;

	@ApiProperty({
		type: [Prize],
	})
	prizes: Prize[];
}
