import { ApiProperty } from "@nestjs/swagger";

export class UploadCouponsSheetDto {
	@ApiProperty({ type: 'string', format: 'binary' })
	file: any;
}
