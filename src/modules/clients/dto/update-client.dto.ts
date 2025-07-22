import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class UpdateClientDto {
    @ApiProperty({ example: "string" })
    @IsString()
    @IsNotEmpty()
    name: string

    @ApiProperty({ example: 1 })
    @IsNumber()
    @Transform(({ value }) => parseInt(value))
    client_id: number;
}