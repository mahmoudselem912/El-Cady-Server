import { Body, Controller, Delete, Get, Post, Query, UseInterceptors } from '@nestjs/common';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { WalimahService } from './walimah.service';
import { FileInterceptor, MemoryStorageFile, UploadedFile } from '@blazity/nest-file-fastify';
import {
	AddCouponDto,
	AddDrawDto,
	AddUserDto,
	checkUserCodeDto,
	GetDashboardClientsDto,
	UploadCouponsSheetDto,
	UploadDto,
	UserIdentifier,
} from './dto';
import { successfulResponse } from 'src/utils/response.handler';
import { DrawIdentifier } from './dto/draw-identifier';

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

	@Post('add-coupon')
	async AddCoupon(@Body() dto: AddCouponDto) {
		const data = await this.walimahService.addCoupon(dto);
		return successfulResponse(data);
	}

	@Post('add-user-coupon')
	async AddUserCoupon(@Body() dto: UserIdentifier) {
		const data = await this.walimahService.addUserCoupon(dto);
		return successfulResponse(data);
	}

	@Get('get-dashboard-clients')
	async GetDashboardClients(@Query() dto: GetDashboardClientsDto) {
		const data = await this.walimahService.getDashboardClients(dto);
		return successfulResponse(data);
	}

	@Get('get-dashboard-coupons')
	async GetDashboardCoupons(@Query() dto: GetDashboardClientsDto) {
		const data = await this.walimahService.getDashboardCoupons(dto);
		return successfulResponse(data);
	}

	@Post('add-draw')
	async AddDraw(@Body() dto: AddDrawDto) {
		const data = await this.walimahService.addDraw(dto);
		return successfulResponse(data);
	}

	@Get('get-all-draws')
	async GetAllDraws() {
		const data = await this.walimahService.getAllDraws();
		return successfulResponse(data);
	}

	@Post('execute-draw')
	async ExecuteDraw(@Body() dto: DrawIdentifier) {
		const data = await this.walimahService.executeDraw(dto);
		return successfulResponse(data);
	}

	@Delete('delete-draw')
	async DeleteDraw(@Query() dto: DrawIdentifier) {
		const data = await this.walimahService.deleteDraw(dto);
		return successfulResponse(data);
	}
}
