import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsNumber, IsOptional, IsString } from "class-validator";

export class UpdateCountryDto {
    @ApiProperty({ example: 1 })
    @IsNumber()
    @Transform(({ value }) => parseInt(value))
    country_id: number;

    @ApiProperty({ example: "title" })
    @IsString()
    @IsOptional()
    title: string
}