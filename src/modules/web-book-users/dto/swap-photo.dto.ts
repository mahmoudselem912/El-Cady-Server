import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsNumber } from "class-validator";

export class SwapPhotoDto {
    @ApiProperty({ example: 1 })
    @IsNumber()
    @Transform(({ value }) => parseInt(value))
    photo_id: number;

    @ApiProperty({ type: 'string', format: 'binary' })
    image: any;
}