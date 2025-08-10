import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class AddCountryDto {
    @ApiProperty({ example: "title" })
    @IsString()
    @IsNotEmpty()
    title: string
}