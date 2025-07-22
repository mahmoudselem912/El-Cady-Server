import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class AddClientDto {
    @ApiProperty({ example: "string" })
    @IsString()
    @IsNotEmpty()
    name: string

}