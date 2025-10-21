import { Body, Controller, Delete, Get, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { WalimahService } from './walimah.service';
import { FileInterceptor, MemoryStorageFile, UploadedFile } from '@blazity/nest-file-fastify';
import {
	AddCouponDto,
	AddDrawDto,
	AddUserDto,
	AddWalimahDashboardUserDto,
	checkUserCodeDto,
	GetDashboardClientsDto,
	GetStatisticsDto,
	UploadCouponsSheetDto,
	UploadDto,
	UserIdentifier,
} from './dto';
import { successfulResponse } from 'src/utils/response.handler';
import { DrawIdentifier } from './dto/draw-identifier';
import { AuthorizeCoreUsersGuard, JwtGuard } from '../auth/guard';
import { CoreUserEnum, CoreUserType, GetUser } from '../auth/decorator';
import { walimah_dashboard_user, walimah_users } from '@prisma/client';

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

	@Get('get-all-walimah-users')
	async GetAllWalimahUsers() {
		const data = await this.walimahService.getAllWalimahUsers();
		return successfulResponse(data);
	}

	@Delete('delete-walimah-user')
	async DeleteWalimahUser(@Query() dto: UserIdentifier) {
		const data = await this.walimahService.deleteWalimahUser(dto);
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

	@ApiBearerAuth()
	@UseGuards(JwtGuard, AuthorizeCoreUsersGuard)
	@CoreUserType(CoreUserEnum.CLIENT)
	@Post('add-coupon')
	async AddCoupon(@Body() dto: AddCouponDto) {
		const data = await this.walimahService.addCoupon(dto);
		return successfulResponse(data);
	}

	// @ApiBearerAuth()
	// @UseGuards(JwtGuard, AuthorizeCoreUsersGuard)
	// @CoreUserType(CoreUserEnum.CLIENT)
	@Post('add-user-coupon')
	async AddUserCoupon(@Body() dto: UserIdentifier) {
		const data = await this.walimahService.addUserCoupon(dto);
		return successfulResponse(data);
	}

	@Delete('delete-all-coupons')
	async DeleteAllCoupons() {
		const data = await this.walimahService.deleteAllCoupons();
		return successfulResponse(data);
	}

	@ApiBearerAuth()
	@UseGuards(JwtGuard, AuthorizeCoreUsersGuard)
	@CoreUserType(CoreUserEnum.CLIENT)
	@Get('get-dashboard-clients')
	async GetDashboardClients(@Query() dto: GetDashboardClientsDto) {
		const data = await this.walimahService.getDashboardClients(dto);
		return successfulResponse(data);
	}

	@ApiBearerAuth()
	@UseGuards(JwtGuard, AuthorizeCoreUsersGuard)
	@CoreUserType(CoreUserEnum.CLIENT)
	@Get('get-dashboard-coupons')
	async GetDashboardCoupons(@Query() dto: GetDashboardClientsDto) {
		const data = await this.walimahService.getDashboardCoupons(dto);
		return successfulResponse(data);
	}

	@ApiBearerAuth()
	@UseGuards(JwtGuard, AuthorizeCoreUsersGuard)
	@CoreUserType(CoreUserEnum.CLIENT)
	@Post('add-draw')
	async AddDraw(@Body() dto: AddDrawDto) {
		const data = await this.walimahService.addDraw(dto);
		return successfulResponse(data);
	}

	@ApiBearerAuth()
	@UseGuards(JwtGuard, AuthorizeCoreUsersGuard)
	@CoreUserType(CoreUserEnum.CLIENT)
	@Get('get-all-draws')
	async GetAllDraws(@Query() dto: GetDashboardClientsDto) {
		const data = await this.walimahService.getAllDraws(dto);
		return successfulResponse(data);
	}

	@ApiBearerAuth()
	@UseGuards(JwtGuard, AuthorizeCoreUsersGuard)
	@CoreUserType(CoreUserEnum.CLIENT)
	@Post('execute-draw')
	async ExecuteDraw(@Body() dto: DrawIdentifier) {
		const data = await this.walimahService.executeDraw(dto);
		return successfulResponse(data);
	}

	@ApiBearerAuth()
	@UseGuards(JwtGuard, AuthorizeCoreUsersGuard)
	@CoreUserType(CoreUserEnum.CLIENT)
	@Delete('delete-draw')
	async DeleteDraw(@Query() dto: DrawIdentifier) {
		const data = await this.walimahService.deleteDraw(dto);
		return successfulResponse(data);
	}

	// @ApiBearerAuth()
	// @UseGuards(JwtGuard, AuthorizeCoreUsersGuard)
	// @CoreUserType(CoreUserEnum.CLIENT)
	@Post('add-walimah-dashboard-user')
	async AddWalimahDashboardUser(@Body() dto: AddWalimahDashboardUserDto) {
		const data = await this.walimahService.addWalimahDashboardUser(dto);
		return successfulResponse(data);
	}

	@ApiBearerAuth()
	@UseGuards(JwtGuard, AuthorizeCoreUsersGuard)
	@CoreUserType(CoreUserEnum.CLIENT)
	@Get('get-all-walimah-dashboard-users')
	async GetAllWalimahDashboardUsers(@Query() dto: GetDashboardClientsDto) {
		const data = await this.walimahService.getAllWalimahDashboardUsers(dto);
		return successfulResponse(data);
	}

	@ApiBearerAuth()
	@UseGuards(JwtGuard, AuthorizeCoreUsersGuard)
	@CoreUserType(CoreUserEnum.CLIENT)
	@Delete('delete-walimah-dashboard-user')
	async DeleteWalimahDashboardUser(@Query() dto: UserIdentifier) {
		const data = await this.walimahService.deleteWalimahDashboardUser(dto);
		return successfulResponse(data);
	}

	@ApiBearerAuth()
	@UseGuards(JwtGuard, AuthorizeCoreUsersGuard)
	@CoreUserType(CoreUserEnum.CLIENT)
	@Get('get-dashboard-user-profile')
	async GetDashboardUserProfile(@GetUser() user: walimah_dashboard_user) {
		const data = await this.walimahService.getDashboardUserProfile(user);
		return successfulResponse(data);
	}

	@ApiBearerAuth()
	@UseGuards(JwtGuard, AuthorizeCoreUsersGuard)
	@CoreUserType(CoreUserEnum.CLIENT)
	@Get('get-statistics')
	async GetStatistics(@Query() dto: GetStatisticsDto, @GetUser() user: walimah_dashboard_user) {
		const data = await this.walimahService.getStatitics(dto);
		return successfulResponse(data);
	}

	@ApiBearerAuth()
	@UseGuards(JwtGuard, AuthorizeCoreUsersGuard)
	@CoreUserType(CoreUserEnum.CLIENT)
	@Delete('delete-extra-coupons')
	async DeleteExtraCoupons() {
		const data = await this.walimahService.deleteExtraCoupons();
		return successfulResponse(data);
	}

	@ApiBearerAuth()
	@UseGuards(JwtGuard, AuthorizeCoreUsersGuard)
	@CoreUserType(CoreUserEnum.CLIENT)
	@Post('export-walimah-users')
	async ExportWalimahUsers() {
		const data = await this.walimahService.exportWalimahUsers();
		return successfulResponse(data);
	}
}
