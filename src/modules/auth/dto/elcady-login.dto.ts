import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class ElcadyUserLoginDto {
    @ApiProperty({ example: "email" })
    @IsString()
    @IsNotEmpty()
    email: string

    @ApiProperty({ example: "name" })
    @IsString()
    @IsNotEmpty()
    password: string
}