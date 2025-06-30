import { Body, Controller, Post, UseInterceptors } from '@nestjs/common';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { WalimahService } from './walimah.service';
import { FileInterceptor, MemoryStorageFile, UploadedFile } from '@blazity/nest-file-fastify';
import { AddUserDto, UploadDto } from './dto';
import { successfulResponse } from 'src/utils/response.handler';

@Controller('walimah')
@ApiTags('Walimah')
export class WalimahController {
	constructor(private readonly walimahService: WalimahService) {}

	@ApiConsumes('multipart/form-data')
	@UseInterceptors(FileInterceptor('file'))
	@Post('upload')
	async upload(@Body() dto: UploadDto, @UploadedFile() file: MemoryStorageFile) {
		const data = await this.walimahService.analyzeAndSave(file);
		return successfulResponse(data);
	}

	@ApiConsumes('multipart/form-data')
	@UseInterceptors(FileInterceptor('file'))
	@Post('add-user')
	async addUser(@Body() dto: AddUserDto, @UploadedFile() file: MemoryStorageFile) {
		const data = await this.walimahService.addUser(dto, file);
		return successfulResponse(data);
	}
}
