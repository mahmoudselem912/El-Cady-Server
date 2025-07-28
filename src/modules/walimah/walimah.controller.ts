import { Body, Controller, Get, Post, Query, UseInterceptors } from '@nestjs/common';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { WalimahService } from './walimah.service';
import { FileInterceptor, MemoryStorageFile, UploadedFile } from '@blazity/nest-file-fastify';
import { AddUserDto, checkUserCodeDto, UploadDto } from './dto';
import { successfulResponse } from 'src/utils/response.handler';

@Controller('walimah')
@ApiTags('Walimah')
export class WalimahController {
	constructor(private readonly walimahService: WalimahService) {}

	@ApiConsumes('multipart/form-data')
	@UseInterceptors(FileInterceptor('file'))
	@Post('upload')
	async upload(@Body() dto: UploadDto, @UploadedFile() file: MemoryStorageFile) {
		const data = await this.walimahService.analyzeAndSave(dto,file);
		return successfulResponse(data);
	}

	// @ApiConsumes('multipart/form-data')
	// @UseInterceptors(FileInterceptor('file'))
	@Post('add-user')
	async addUser(@Body() dto: AddUserDto) {
		const data = await this.walimahService.addUser(dto);
		return successfulResponse(data);
	}

	@Get('check-user-code')
	async CheckUserCode(@Query() dto: checkUserCodeDto) {
		const data = await this.walimahService.checkUserCode(dto)
		return successfulResponse(data)
	}

}
