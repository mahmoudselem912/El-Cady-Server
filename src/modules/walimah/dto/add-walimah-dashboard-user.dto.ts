import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AddWalimahDashboardUserDto {
	@ApiProperty({ example: 'name' })
	@IsString()
	@IsNotEmpty()
	name: string;

	@ApiProperty({ example: 'password' })
	@IsString()
	@IsNotEmpty()
	password: string;
}
