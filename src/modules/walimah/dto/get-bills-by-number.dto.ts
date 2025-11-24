import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class GetBillsByNumberDto {
    @ApiProperty({example: "number"})
    @IsString()
    @IsNotEmpty()
    number: string
}