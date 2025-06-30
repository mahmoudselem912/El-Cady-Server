import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class DeleteFilesDtoWithoutQrcode {
	@ApiProperty({ example: ['asdc_client_TAX_photo'] })
	@IsArray()
	@ArrayNotEmpty()
	@IsString({ each: true })
	fileFieldNames: string[];

	@ApiProperty({ example: 'folder/folder/folder' })
	@Matches(/^([^/]+\/)*[^/]+$/, {
		message: 'folders must be in this structure folder/folder/folder ',
	})
	nestedFolder: string;
}
export class DeleteFilesDto extends DeleteFilesDtoWithoutQrcode {
	@ApiProperty({ example: '4MryyCi5sd' })
	@IsString()
	@IsNotEmpty()
	@Length(10, 10, {
		message: 'Please enter a valid qrcode',
	})
	clientQrcode: string;
}
