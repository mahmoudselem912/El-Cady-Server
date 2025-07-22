import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class AddWebBookUserDto {
    @ApiProperty({ example: 1 })
    @IsNumber()
    @Transform(({ value }) => parseInt(value))
    client_id: number;
    
    @ApiProperty({ example: "name" })
    @IsString()
    @IsNotEmpty()
    name: string

    @ApiProperty({ example: "text" })
    @IsString()
    @IsNotEmpty()
    text: string

    @ApiProperty({ type: 'string', format: 'binary' })
    image: any;
}