import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsNumber } from "class-validator";

export class DrawIdentifier {
	@ApiProperty({ example: 1 })
	@IsNumber()
	@Transform(({ value }) => parseInt(value))
	draw_id: number;
}
