import { Body, Controller, Delete, Get, Post, Query, UseInterceptors } from '@nestjs/common';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { WalimahService } from './walimah.service';
import { FileInterceptor, MemoryStorageFile, UploadedFile } from '@blazity/nest-file-fastify';
import { AddUserDto, checkUserCodeDto, UploadCouponsSheetDto, UploadDto, UserIdentifier } from './dto';
import { successfulResponse } from 'src/utils/response.handler';

@Controller('walimah')
@ApiTags('Walimah')
export class WalimahController {
	constructor(private readonly walimahService: WalimahService) {}

	@ApiConsumes('multipart/form-data')
	@UseInterceptors(FileInterceptor('file'))
	@Post('upload')
	async upload(@Body() dto: UploadDto, @UploadedFile() file: MemoryStorageFile) {
		const data = await this.walimahService.analyzeAndSave(dto, file);
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
		const data = await this.walimahService.checkUserCode(dto);
		return successfulResponse(data);
	}

	@Get('get-profile')
	async GetProfile(@Query() dto: UserIdentifier) {
		const data = await this.walimahService.getProfile(dto);
		return successfulResponse(data);
	}

	@Post('assign-codes')
	async AssignCodes() {
		const data = await this.walimahService.assignCodes();
		return successfulResponse(data);
	}

	@Delete('delete-all-walimah-images')
	async DeleteAllWalimahImages() {
		const data = await this.walimahService.deleteAllWalimahImages();
		return successfulResponse(data);
	}

	@ApiConsumes('multipart/form-data')
	@UseInterceptors(FileInterceptor('file'))
	@Post('upload-coupons-sheet')
	async UploadCouponsSheet(@Body() dto: UploadCouponsSheetDto, @UploadedFile() file: MemoryStorageFile) {
		const data = await this.walimahService.uploadCouponsSheet(dto, file);
		return successfulResponse(data);
	}

	@Post('add-user-coupon')
	async AddUserCoupon(@Body() dto: UserIdentifier) {
		const data = await this.walimahService.addUserCoupon(dto);
		return successfulResponse(data);
	}

	@Get('get-dashboard-clients')
	async GetDashboardClients() {
		const data = await this.walimahService.getDashboardClients();
		return successfulResponse(data);
	}
}
