import { Body, Controller, Delete, Get, Patch, Post, Query, Res, UseInterceptors } from '@nestjs/common';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { WebBookUsersService } from './web-book-users.service';
import {
	FileInterceptor,
	FilesInterceptor,
	MemoryStorageFile,
	UploadedFile,
	UploadedFiles,
} from '@blazity/nest-file-fastify';
import { AddWebBookUserDto, SwapPhotoDto, UpdateWebBookUserDto, UpdateWebBookUserImageDto, UploadSwapPhotosDto, UserIdentifier } from './dto';
import { successfulResponse } from 'src/utils/response.handler';
import { ClientIdentifier } from '../clients/dto';
import { Response } from 'express';

@Controller('web-book-users')
@ApiTags('Web-Book-Users')
export class WebBookUsersController {
	constructor(private readonly webBookUsersService: WebBookUsersService) {}

	@ApiConsumes('multipart/form-data')
	@UseInterceptors(FileInterceptor('image'))
	@Post('add-webBook-user')
	async AddWebBookUser(@Body() dto: AddWebBookUserDto, @UploadedFile() file: MemoryStorageFile) {
		const data = await this.webBookUsersService.addWebBookUser(dto, file);
		return successfulResponse(data);
	}

	@Get('get-all-webBook-users')
	async GetAllUsers(@Query() dto: ClientIdentifier) {
		const data = await this.webBookUsersService.getAllUsers(dto);
		return successfulResponse(data);
	}

	@Delete('delete-all-webBook-users')
	async DeleteAllWebBookUsers(@Query() dto: ClientIdentifier) {
		const data = await this.webBookUsersService.deleteAllUsers(dto);
		return successfulResponse(data);
	}

	@Delete('delete-webBook-user')
	async DeleteWebBookUser(@Query() dto: UserIdentifier) {
		const data = await this.webBookUsersService.deleteUser(dto);
		return successfulResponse(data);
	}

	@Patch('update-webBook-user')
	async UpdateWebBookUser(@Query() dto: UpdateWebBookUserDto) {
		const data = await this.webBookUsersService.updateWebBookUser(dto);
		return successfulResponse(data);
	}

	@ApiConsumes('multipart/form-data')
	@UseInterceptors(FileInterceptor('image'))
	@Patch('update-webBook-user-image')
	async UpdateWebBookUserImage(@Body() dto: UpdateWebBookUserImageDto, @UploadedFile() file: MemoryStorageFile) {
		const data = await this.webBookUsersService.updateWebBookUserImage(dto, file);
		return successfulResponse(data);
	}

	@ApiConsumes('multipart/form-data')
	@UseInterceptors(FilesInterceptor('files', 100))
	@Post('Upload-swap-photos')
	async UploadSwapPhotos(@Body() dto: UploadSwapPhotosDto, @UploadedFiles() files: MemoryStorageFile[]) {
		const data = await this.webBookUsersService.uploadSwapPhotos(dto, files);
		return successfulResponse(data);
	}

	@Get('get-all-swap-photos')
	async GetAllSwapPhotos() {
		const data = await this.webBookUsersService.getAllSwapPhotos();
		return successfulResponse(data);
	}

	@Delete('delete-all-swap-photos')
	async DeleteAllSwapPhotos() {
		const data = await this.webBookUsersService.deleteAllSwapPhotos();
		return successfulResponse(data);
	}

	@ApiConsumes('multipart/form-data')
	@UseInterceptors(FileInterceptor('image'))
	@Post('swap-photo')
	async SwapPhoto(@Body() dto: SwapPhotoDto, @UploadedFile() file: MemoryStorageFile) {
		const data = await this.webBookUsersService.swapPhoto(dto, file);
		return successfulResponse(data);
	}
}
