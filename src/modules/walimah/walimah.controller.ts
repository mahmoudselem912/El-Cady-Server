import { Body, Controller, Delete, Get, Post, Query, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { WalimahService } from './walimah.service';
import { FileInterceptor, MemoryStorageFile, UploadedFile } from '@blazity/nest-file-fastify';
import {
	AddCouponDto,
	AddDrawDto,
	AddUserDto,
	AddWalimahCountryDto,
	AddWalimahDashboardUserDto,
	checkUserCodeDto,
	ExportUploadBillsHistoryDto,
	ExportWalimahUsersDto,
	GetDashboardClientsDto,
	GetStatisticsDto,
	GetUsersByCouponCompany,
	UploadCouponsSheetDto,
	UploadDto,
	UserIdentifier,
} from './dto';
import { successfulResponse } from 'src/utils/response.handler';
import { DrawIdentifier } from './dto/draw-identifier';
import { AuthorizeCoreUsersGuard, JwtGuard } from '../auth/guard';
import { CoreUserEnum, CoreUserType, GetUser } from '../auth/decorator';
import { walimah_dashboard_user, walimah_users } from '@prisma/client';
import { FastifyRequest } from 'fastify';

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

	// @ApiBearerAuth()
	// @UseGuards(JwtGuard, AuthorizeCoreUsersGuard)
	// @CoreUserType(CoreUserEnum.CLIENT)
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

	// @ApiBearerAuth()
	// @UseGuards(JwtGuard, AuthorizeCoreUsersGuard)
	// @CoreUserType(CoreUserEnum.CLIENT)
	@Get('get-dashboard-clients')
	async GetDashboardClients(@Query() dto: GetDashboardClientsDto) {
		const data = await this.walimahService.getDashboardClients(dto);
		return successfulResponse(data);
	}

	// @ApiBearerAuth()
	// @UseGuards(JwtGuard, AuthorizeCoreUsersGuard)
	// @CoreUserType(CoreUserEnum.CLIENT)
	@Get('get-dashboard-coupons')
	async GetDashboardCoupons(@Query() dto: GetDashboardClientsDto) {
		const data = await this.walimahService.getDashboardCoupons(dto);
		return successfulResponse(data);
	}

	// @ApiBearerAuth()
	// @UseGuards(JwtGuard, AuthorizeCoreUsersGuard)
	// @CoreUserType(CoreUserEnum.CLIENT)
	@Post('add-draw')
	async AddDraw(@Body() dto: AddDrawDto) {
		const data = await this.walimahService.addDraw(dto);
		return successfulResponse(data);
	}

	// @ApiBearerAuth()
	// @UseGuards(JwtGuard, AuthorizeCoreUsersGuard)
	// @CoreUserType(CoreUserEnum.CLIENT)
	@Get('get-all-draws')
	async GetAllDraws(@Query() dto: GetDashboardClientsDto) {
		const data = await this.walimahService.getAllDraws(dto);
		return successfulResponse(data);
	}

	// @ApiBearerAuth()
	// @UseGuards(JwtGuard, AuthorizeCoreUsersGuard)
	// @CoreUserType(CoreUserEnum.CLIENT)
	@Post('execute-draw')
	async ExecuteDraw(@Body() dto: DrawIdentifier) {
		const data = await this.walimahService.executeDraw(dto);
		return successfulResponse(data);
	}

	// @ApiBearerAuth()
	// @UseGuards(JwtGuard, AuthorizeCoreUsersGuard)
	// @CoreUserType(CoreUserEnum.CLIENT)
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

	// @ApiBearerAuth()
	// @UseGuards(JwtGuard, AuthorizeCoreUsersGuard)
	// @CoreUserType(CoreUserEnum.CLIENT)
	@Get('get-all-walimah-dashboard-users')
	async GetAllWalimahDashboardUsers(@Query() dto: GetDashboardClientsDto) {
		const data = await this.walimahService.getAllWalimahDashboardUsers(dto);
		return successfulResponse(data);
	}

	// @ApiBearerAuth()
	// @UseGuards(JwtGuard, AuthorizeCoreUsersGuard)
	// @CoreUserType(CoreUserEnum.CLIENT)
	@Delete('delete-walimah-dashboard-user')
	async DeleteWalimahDashboardUser(@Query() dto: UserIdentifier) {
		const data = await this.walimahService.deleteWalimahDashboardUser(dto);
		return successfulResponse(data);
	}

	// @ApiBearerAuth()
	// @UseGuards(JwtGuard, AuthorizeCoreUsersGuard)
	// @CoreUserType(CoreUserEnum.CLIENT)
	@Get('get-dashboard-user-profile')
	async GetDashboardUserProfile(@GetUser() user: walimah_dashboard_user) {
		const data = await this.walimahService.getDashboardUserProfile(user);
		return successfulResponse(data);
	}

	// @ApiBearerAuth()
	// @UseGuards(JwtGuard, AuthorizeCoreUsersGuard)
	// @CoreUserType(CoreUserEnum.CLIENT)
	@Get('get-statistics')
	async GetStatistics(@Query() dto: GetStatisticsDto, @GetUser() user: walimah_dashboard_user) {
		const data = await this.walimahService.getStatitics(dto);
		return successfulResponse(data);
	}

	// @ApiBearerAuth()
	// @UseGuards(JwtGuard, AuthorizeCoreUsersGuard)
	// @CoreUserType(CoreUserEnum.CLIENT)
	@Delete('delete-extra-coupons')
	async DeleteExtraCoupons() {
		const data = await this.walimahService.deleteExtraCoupons();
		return successfulResponse(data);
	}

	// @ApiBearerAuth()
	// @UseGuards(JwtGuard, AuthorizeCoreUsersGuard)
	// @CoreUserType(CoreUserEnum.CLIENT)
	@Post('export-walimah-users')
	async ExportWalimahUsers(@Body() dto: ExportWalimahUsersDto) {
		const data = await this.walimahService.exportWalimahUsers(dto);
		return successfulResponse(data);
	}

	// @ApiBearerAuth()
	// @UseGuards(JwtGuard, AuthorizeCoreUsersGuard)
	// @CoreUserType(CoreUserEnum.CLIENT)
	@Get('get-users-by-coupon-company')
	async GetUsersByCouponCompany(@Query() dto: GetUsersByCouponCompany) {
		const data = await this.walimahService.getUsersByCouponCompany(dto);
		return successfulResponse(data);
	}

	// @ApiBearerAuth()
	// @UseGuards(JwtGuard, AuthorizeCoreUsersGuard)
	// @CoreUserType(CoreUserEnum.CLIENT)
	@Get('give-me-now')
	async GiveMeNow() {
		const data = await this.walimahService.giveMeNow();
		return successfulResponse(data);
	}

	// @ApiBearerAuth()
	// @UseGuards(JwtGuard, AuthorizeCoreUsersGuard)
	// @CoreUserType(CoreUserEnum.CLIENT)
	@Get('export-upload-bills-history')
	async ExportUploadBillsHistory(@Query() dto: ExportUploadBillsHistoryDto) {
		const data = await this.walimahService.exportUploadBillsHistory(dto);
		return successfulResponse(data);
	}

	@Get('record-visit')
	async record(@Req() req: FastifyRequest) {
		const ip = this.getClientIp(req);
		const fingerprint = req.headers['user-agent'] || 'unknown';
		const data = await this.walimahService.recordVisit(ip, fingerprint);
		return successfulResponse(data);
	}

	@Get('get-daily-traffic')
	async getDaily() {
		const data = await this.walimahService.getDailyUniqueVisitors();
		return successfulResponse(data);
	}

	@Post('add-country')
	async AddCountry(@Body() dto: AddWalimahCountryDto) {
		const data = await this.walimahService.addCountry(dto);
		return successfulResponse(data);
	}

	@Get('get-all-countries')
	async GetAllCountries() {
		const data = await this.walimahService.getAllCountries();
		return successfulResponse(data);
	}

	@Get('export-all-countries')
	async ExportAllCountries() {
		const data = await this.walimahService.exportAllCountries();
		return successfulResponse(data);
	}

	@ApiConsumes('multipart/form-data')
	@UseInterceptors(FileInterceptor('file'))
	@Post('update-country-sheet')
	async UpdateCountrySheet(@Body() dto: UploadCouponsSheetDto, @UploadedFile() file: MemoryStorageFile) {
		const data = await this.walimahService.updateCountrySheet(dto, file);
		return successfulResponse(data);
	}

	@ApiConsumes('multipart/form-data')
	@UseInterceptors(FileInterceptor('file'))
	@Post('update-users-country')
	async UpdateUsersCountry(@Body() dto: UploadCouponsSheetDto, @UploadedFile() file: MemoryStorageFile) {
		const data = await this.walimahService.updateUsersCountry(dto, file);
		return successfulResponse(data);
	}

	private getClientIp(req: FastifyRequest): string {
		// Handles proxies like Nginx or Cloudflare
		const forwarded = req.headers['x-forwarded-for'];
		if (forwarded) {
			const ipList = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
			return ipList.trim();
		}
		return req.ip; // fallback to Fastify’s IP
	}
}
