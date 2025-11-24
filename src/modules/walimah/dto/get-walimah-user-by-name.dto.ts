import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GetWalimahUserByNameDto {
	@ApiProperty({ example: 'name' })
	@IsString()
	@IsNotEmpty()
	name: string;
}
