import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class AskDto {
    @ApiProperty({example: "string"})
    @IsString()
    @IsNotEmpty()
    question: string
}