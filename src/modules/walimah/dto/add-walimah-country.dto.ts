import { ApiProperty } from '@nestjs/swagger';
import { CountryLocation } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class AddWalimahCountryDto {
	@ApiProperty({ example: 'title' })
	@IsString()
	@IsNotEmpty()
	title: string;

	@ApiProperty({ example: 'title' })
	@IsString()
	@IsNotEmpty()
	title_en: string;

	@ApiProperty({ example: CountryLocation.East })
	@IsEnum(CountryLocation)
	location: CountryLocation;
}
