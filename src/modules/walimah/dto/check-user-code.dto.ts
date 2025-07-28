import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class checkUserCodeDto {
    @ApiProperty({ example: "code" })
    @IsString()
    @IsNotEmpty()
    code: string
}