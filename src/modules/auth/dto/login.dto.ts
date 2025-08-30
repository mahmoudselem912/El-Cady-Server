import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class UserLoginDto {
    @ApiProperty({ example: "name" })
    @IsString()
    @IsNotEmpty()
    name: string

    @ApiProperty({ example: "name" })
    @IsString()
    @IsNotEmpty()
    password: string
}