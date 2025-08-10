import { ApiProperty } from "@nestjs/swagger";
import { Body, Gender } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsEnum, IsNotEmpty, IsNumber } from "class-validator";

export class UploadSwapPhotosDto {

    @ApiProperty({ example: 'Male' })
    @IsEnum(Gender)
    @IsNotEmpty()
    gender: Gender;

    @ApiProperty({ example: 'Thin' })
    @IsEnum(Body)
    @IsNotEmpty()
    body: Body;

    @ApiProperty({ example: 1 })
    @IsNumber()
    @Transform(({ value }) => parseInt(value))
    country_id: number;

    @ApiProperty({ example: 1 })
    @IsNumber()
    @Transform(({ value }) => parseInt(value))
    client_id: number;

    @ApiProperty({
        type: 'array',
        items: {
            type: 'string',
            format: 'binary',
            description: 'Attach an image file for each question',
        },
        required: false,
    })
    files: any[];
}