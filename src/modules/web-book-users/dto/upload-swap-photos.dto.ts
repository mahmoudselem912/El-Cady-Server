import { ApiProperty } from "@nestjs/swagger";

export class UploadSwapPhotosDto {
    @ApiProperty({
        type: 'array',
        items: {
            type: 'string',
            format: 'binary',
            description: 'Attach an image file for each question',
        },
        required: false,
    })
    files: any[];
}