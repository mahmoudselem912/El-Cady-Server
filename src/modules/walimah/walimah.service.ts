import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import OpenAI from 'openai';
import { MemoryStorageFile } from '@blazity/nest-file-fastify';
import { CustomBadRequestException, CustomNotFoundException } from 'src/utils/custom.exceptions';
import { handleException } from 'src/utils/error.handler';
import {
	AddCouponDto,
	AddDrawDto,
	AddUserDto,
	AddWalimahDashboardUserDto,
	checkUserCodeDto,
	GetDashboardClientsDto,
	UploadCouponsSheetDto,
	UploadDto,
	UserIdentifier,
} from './dto';
import { addPathToFiles, saveFilesOnServer } from 'src/utils/file.handler';
import { ConfigService } from '@nestjs/config';
import * as XLSX from 'xlsx';
import { DrawIdentifier } from './dto/draw-identifier';
import { hashPassword } from 'src/utils/bcrypt';
import { CouponCompany, Prisma, walimah_dashboard_user } from '@prisma/client';

@Injectable()
export class WalimahService {
	private readonly openai: OpenAI;

	constructor(
		private readonly prisma: PrismaService,
		private readonly config: ConfigService,
	) {
		this.openai = new OpenAI({
			apiKey: config.get('OPEN_AI_KEY'),
		});
	}

	private parseResponse(raw: string): any {
		try {
			const json = raw.replace(/```(json)?/g, '').trim();
			return JSON.parse(json);
		} catch (e) {
			return {
				error: {
					message: 'INVALID_JSON_RESPONSE',
					status: 500,
				},
			};
		}
	}
	private async generateUniqueUserCode(): Promise<string> {
		const prefix = 'WLM';
		const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

		let code: string;
		let isUnique = false;

		while (!isUnique) {
			const number = Math.floor(100 + Math.random() * 900); // 100 - 999
			const letter = characters.charAt(Math.floor(Math.random() * characters.length));
			code = `${prefix}${number}${letter}`;

			const existingUser = await this.prisma.walimah_users.findFirst({
				where: { code },
			});

			isUnique = !existingUser;
		}

		return code;
	}

	private async useOpenAI(base64ImageString: string) {
		const prompt = `
أنت خبير في تحليل فواتير المشتريات. المطلوب منك:

1. استخراج تاريخ الفاتورة بصيغة yyyy-mm-dd.
2. استخراج رقم الفاتورة.
3. تحديد ما إذا كانت الفاتورة حقيقية (صادرة من نظام نقاط بيع رسمي).
4. التحقق مما إذا كانت الفاتورة تحتوي على منتج يتعلق بـ "أرز الوليمة".
   - المنتج يُعتبر "أرز الوليمة" إذا احتوى اسمه على كلمتين تدلان على:
     • كلمة "الوليمة" أو "WALIMAH"
     • كلمة "أرز" أو "RICE"
   - الكلمات قد تأتي بأي ترتيب أو مع أوصاف إضافية مثل: "أرز الوليمة"، "الوليمة أرز بسمتي"، "AL WALIMAH SELLA R"، "الوليمة أرز كبير".
   - المهم أن تكون الكلمتان موجودتان معًا في اسم المنتج.
5. إذا لم يظهر في الفاتورة أي منتج يحتوي على الكلمتين معًا، فاعتبر أنه غير موجود.

### الشكل المطلوب للإجابة:

{
  "invoiceDate": "yyyy-mm-dd",
  "invoiceNumber": "رقم الفاتورة",
  "isReal": true,
  "hasRice": {
    "value": true,
    "reason": "الفاتورة تحتوي على بند باسم 'الوليمة ارز بسمتي'"
  }
}

إذا لم تتمكن من استخراج البيانات، ارجع النتيجة بهذا الشكل:

{
  "error": {
    "message": "DESCRIPTION_OF_THE_ERROR_IN_UPPER_CASE_UNDERSCORED",
    "status": 500
  }
}
`;

		try {
			const response = await this.openai.chat.completions.create({
				model: 'gpt-4.1-nano',
				messages: [
					{
						role: 'user',
						content: [
							{ type: 'text', text: prompt },
							{
								type: 'image_url',
								image_url: {
									url: base64ImageString,
									detail: 'high',
								},
							},
						],
					},
				],
				max_tokens: 800,
			});

			console.log(`response: ${response}`);

			const content = response.choices[0].message.content;
			return this.parseResponse(content);
		} catch (error) {
			console.log(error);
			return {
				error: {
					message: 'OPENAI_REQUEST_FAILED',
					status: 500,
				},
			};
		}
	}

	async analyzeAndSave(dto: UploadDto, file: MemoryStorageFile) {
		try {
			const ExistinUser = await this.prisma.walimah_users.findFirst({
				where: {
					id: dto.user_id,
				},
			});

			if (!ExistinUser) {
				throw new CustomNotFoundException('User not found!');
			}

			if (!file.mimetype || !['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.mimetype)) {
				throw new CustomBadRequestException('Invalid image type');
			}

			console.log(file);

			const base64Image1 = Buffer.from(file.buffer).toString('base64');

			// Prepend data URI scheme if needed (optional)
			const dataURI = `data:${file.mimetype};base64,${base64Image1}`;

			const result = await this.useOpenAI(dataURI);

			// Handle OpenAI errors
			if (result?.error) {
				throw new CustomBadRequestException(result.error.message);
			}

			const nestedFolder = `users/user-${ExistinUser.name.replaceAll(' ', '')}`;
			const filesWithPathAndURl = await addPathToFiles([file], 'ElCady', nestedFolder);

			if (result.hasRice.value) {
				const ExistingBill = await this.prisma.walimah_users_bills.findFirst({
					where: {
						bill_number: result.invoiceNumber,
					},
				});

				if (ExistingBill) {
					throw new CustomBadRequestException('هذه الفاتورة تم رفعها بالفعل');
				}
			}

			await this.prisma.walimah_users_bills.create({
				data: {
					walimah_user_id: dto.user_id,
					bill_number: result?.invoiceNumber,
					bill_image: filesWithPathAndURl[0].fileurl,
				},
			});

			if (file)
				try {
					await saveFilesOnServer(filesWithPathAndURl);
				} catch (error) {
					await this.prisma.walimah_users.delete({
						where: { id: ExistinUser.id },
					});

					throw new InternalServerErrorException(
						'Error saving files while creating User',
						(error as Error).message,
					);
				}

			return result;
		} catch (error) {
			handleException(error, {});
		}
	}

	async addUser(dto: AddUserDto) {
		try {
			const ExistingUser = await this.prisma.walimah_users.findFirst({
				where: {
					number: dto.number,
				},
			});

			if (ExistingUser) {
				return { user: ExistingUser, type: 'exist' };
			} else {
				const code = await this.generateUniqueUserCode();

				const user = await this.prisma.walimah_users.create({
					data: {
						name: dto.name,
						city: dto.city,
						email: dto.email,
						number: dto.number,
						code: code,
						usedCode: dto.code,
					},
				});

				return { user, type: 'new' };
			}
		} catch (error) {
			handleException(error, dto);
		}
	}

	async getAllWalimahUsers() {
		try {
			const users = await this.prisma.walimah_users.findMany();
			return users;
		} catch (error) {
			handleException(error, {});
		}
	}

	async deleteWalimahUser(dto: UserIdentifier) {
		try {
			const User = await this.prisma.walimah_users.delete({
				where: {
					id: dto.user_id,
				},
			});

			return User;
		} catch (error) {
			handleException(error, dto);
		}
	}

	async checkUserCode(dto: checkUserCodeDto) {
		try {
			const ExistingUser = await this.prisma.walimah_users.findFirst({
				where: {
					code: dto.code,
				},
			});

			if (!ExistingUser) {
				throw new CustomNotFoundException('Code not found!');
			}

			return 'Code is correct';
		} catch (error) {
			handleException(error, dto);
		}
	}

	async getProfile(dto: UserIdentifier) {
		try {
			const ExistingUser = await this.prisma.walimah_users.findFirst({
				where: {
					id: dto.user_id,
				},
			});

			if (!ExistingUser) {
				throw new CustomNotFoundException('User not found!');
			}
			let nominatedTimes = 0;
			if (ExistingUser.code) {
				nominatedTimes = await this.prisma.walimah_users.count({
					where: {
						usedCode: ExistingUser.code,
					},
				});
			}

			const userCoupons = await this.prisma.user_Coupons.findMany({
				where: {
					user_id: dto.user_id,
				},
				include: {
					coupon: true,
				},
			});
			return {
				user: ExistingUser,
				nominatedTimes,
				userCoupons,
			};
		} catch (error) {
			handleException(error, dto);
		}
	}

	async assignCodes() {
		try {
			const usersWithoutCode = await this.prisma.walimah_users.findMany({
				where: {
					code: null,
				},
			});

			for (const user of usersWithoutCode) {
				const uniqueCode = await this.generateUniqueUserCode();

				await this.prisma.walimah_users.update({
					where: { id: user.id },
					data: { code: uniqueCode },
				});
			}

			return {
				message: `Codes assigned to ${usersWithoutCode.length} users.`,
			};
		} catch (error) {
			handleException(error, {});
		}
	}

	async deleteAllWalimahImages() {
		try {
			const deletedImages = await this.prisma.walimah_users_bills.deleteMany();
			return deletedImages;
		} catch (error) {
			handleException(error, {});
		}
	}

	async uploadCouponsSheet(dto: UploadCouponsSheetDto, file: MemoryStorageFile) {
		try {
			if (!file) {
				throw new CustomBadRequestException('No file uploaded');
			}

			// 1️⃣ Parse Excel buffer
			const workbook = XLSX.read(file.buffer, { type: 'buffer' });
			const sheetName = workbook.SheetNames[0]; // first sheet
			const worksheet = workbook.Sheets[sheetName];

			// 2️⃣ Convert to JSON
			const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
			// header:1 → returns array of arrays instead of objects

			// 3️⃣ Skip header row if exists
			const dataRows = rows.slice(1);

			// 4️⃣ Map rows into Prisma insert
			const couponsData = dataRows
				.map((row: any[]) => {
					return {
						name: row[0]?.toString().trim(), // Column A
						company: row[1]?.toString().trim(), // Column B
						type: row[2]?.toString().trim(), // Column C
						value: row[3]?.toString().trim(), // Column D
						// startDate: new Date(row[4]), // Column E
						// endDate: new Date(row[5]), // Column F
					};
				})
				.filter((c) => c.name); // filter out empty rows

			// 5️⃣ Insert into DB
			await this.prisma.coupons.createMany({
				data: couponsData,
				skipDuplicates: true,
			});

			return { success: true, count: couponsData.length };
		} catch (error) {
			handleException(error, dto);
		}
	}

	async addUserCoupon(dto: UserIdentifier) {
		try {
			// 1️⃣ Validate user
			const user = await this.prisma.walimah_users.findUnique({
				where: { id: dto.user_id },
			});
			if (!user) throw new CustomNotFoundException('User not found!');

			// 2️⃣ Fetch all coupons and their companies
			const allCoupons = await this.prisma.coupons.findMany({
				select: { id: true, company: true },
			});

			// 3️⃣ Fetch all assigned coupons
			const allUserCoupons = await this.prisma.user_Coupons.findMany({
				select: { coupon_id: true },
			});

			// 4️⃣ Build a map of coupon_id → company
			const couponCompanyMap = new Map<number, string>();
			for (const c of allCoupons) {
				couponCompanyMap.set(c.id, c.company);
			}

			// 5️⃣ Count usage per company (in JS)
			const usageMap: Record<string, number> = {};
			for (const company of Object.values(CouponCompany)) {
				usageMap[company] = 0;
			}

			for (const uc of allUserCoupons) {
				const company = couponCompanyMap.get(uc.coupon_id);
				if (company) usageMap[company] += 1;
			}

			// 6️⃣ Find least used company
			const allCompanies = Object.values(CouponCompany);
			let leastUsedCompany = allCompanies.reduce((min, current) =>
				usageMap[current] < usageMap[min] ? current : min,
			);

			// 7️⃣ Check available companies (skip empty ones)
			let availableCompany: CouponCompany | null = null;

			for (const company of allCompanies.sort((a, b) => usageMap[a] - usageMap[b])) {
				const availableCount = await this.prisma.coupons.count({
					where: {
						company,
						user_Coupons: { none: {} }, // unused coupons only
					},
				});
				if (availableCount > 0) {
					availableCompany = company;
					break;
				}
			}

			if (!availableCompany) {
				throw new CustomNotFoundException('All coupons have been used!');
			}

			// 8️⃣ Pick random unused coupon from that company
			const totalAvailable = await this.prisma.coupons.count({
				where: {
					company: availableCompany,
					user_Coupons: { none: {} },
				},
			});

			const randomIndex = Math.floor(Math.random() * totalAvailable);
			const randomCoupon = await this.prisma.coupons.findFirst({
				where: {
					company: availableCompany,
					user_Coupons: { none: {} },
				},
				skip: randomIndex,
				take: 1,
			});

			if (!randomCoupon) {
				throw new CustomNotFoundException('No available coupon found');
			}

			// 9️⃣ Assign coupon to user
			const assigned = await this.prisma.user_Coupons.create({
				data: {
					user_id: user.id,
					coupon_id: randomCoupon.id,
				},
				include: {
					coupon: true,
				},
			});

			// ✅ Return the assigned coupon
			return assigned.coupon;
		} catch (error) {
			handleException(error, dto);
		}
	}

	async getDashboardClients(dto: GetDashboardClientsDto) {
		try {
			// 1️⃣ Fetch all users (for statistics)
			const allUsers = await this.prisma.walimah_users.findMany({
				include: {
					user_Coupons: true,
					walimah_users_bills: true,
				},
			});

			// 2️⃣ Build code usage map
			const usageMap: Record<string, number> = {};
			for (const u of allUsers) {
				if (u.usedCode) {
					usageMap[u.usedCode] = (usageMap[u.usedCode] || 0) + 1;
				}
			}

			// 3️⃣ Enrich all users with sharedCount
			const enrichedAllUsers = allUsers.map((u) => ({
				...u,
				sharedCount: u.code ? usageMap[u.code] || 0 : 0,
			}));

			// 4️⃣ Apply search filter
			let filteredUsers = enrichedAllUsers;
			if (dto.search) {
				const searchLower = dto.search.toLowerCase();
				filteredUsers = enrichedAllUsers.filter(
					(u) =>
						u.name.toLowerCase().includes(searchLower) ||
						u.email.toLowerCase().includes(searchLower) ||
						(u.code && u.code.toLowerCase().includes(searchLower)),
				);
			}

			let paginatedUsers = filteredUsers;
			let totalPages = 1;

			// 5️⃣ Apply pagination only if both page and pageItemsCount are provided
			if (dto.page && dto.pageItemsCount) {
				const start = (dto.page - 1) * dto.pageItemsCount;
				paginatedUsers = filteredUsers.slice(start, start + dto.pageItemsCount);
				totalPages = Math.ceil(filteredUsers.length / dto.pageItemsCount);
			}

			// 6️⃣ Calculate global statistics
			const totalUsers = enrichedAllUsers.length;
			const sharedUsersCount = enrichedAllUsers.filter((u) => u.sharedCount > 0).length;
			const winnersCount = enrichedAllUsers.filter((u) => u.user_Coupons.length > 0).length;

			return {
				users: paginatedUsers,
				totalUsers,
				sharedUsersCount,
				winnersCount,
				page: dto.page || null,
				pageItemsCount: dto.pageItemsCount || null,
				totalPages,
			};
		} catch (error) {
			handleException(error, {});
		}
	}

	async getDashboardCoupons(dto: GetDashboardClientsDto) {
		try {
			// 1️⃣ Fetch all coupons (for statistics)
			const allCoupons = await this.prisma.coupons.findMany({
				include: {
					user_Coupons: true,
				},
			});

			// 2️⃣ Global statistics
			const totalCoupons = allCoupons.length;
			const totalRedemptions = allCoupons.reduce((acc, c) => acc + c.user_Coupons.length, 0);
			const activeCouponsCount = allCoupons.filter((c) => c.user_Coupons.length > 0).length;
			const avgRedemptionRate = totalCoupons > 0 ? totalRedemptions / totalCoupons : 0;

			// 3️⃣ Apply search filter
			let filteredCoupons = allCoupons;
			if (dto.search) {
				const searchLower = dto.search.toLowerCase();
				filteredCoupons = allCoupons.filter((c) => c.name.toLowerCase().includes(searchLower));
			}

			// 4️⃣ Apply pagination if page and pageItemsCount are provided
			let paginatedCoupons = filteredCoupons;
			let totalPages = 1;
			if (dto.page && dto.pageItemsCount) {
				const start = (dto.page - 1) * dto.pageItemsCount;
				paginatedCoupons = filteredCoupons.slice(start, start + dto.pageItemsCount);
				totalPages = Math.ceil(filteredCoupons.length / dto.pageItemsCount);
			}

			return {
				coupons: paginatedCoupons,
				totalCoupons,
				activeCouponsCount,
				totalRedemptions,
				avgRedemptionRate,
				page: dto.page || null,
				pageItemsCount: dto.pageItemsCount || null,
				totalPages,
			};
		} catch (error) {
			handleException(error, {});
		}
	}

	async addCoupon(dto: AddCouponDto) {
		try {
			const code = await this.prisma.coupons.create({
				data: {
					name: dto.code,
					// startDate: new Date(dto.startDate),
					// endDate: new Date(dto.endDate),
					company: dto.company,
					type: dto.type,
					value: dto.value,
				},
			});

			return code;
		} catch (error) {
			handleException(error, dto);
		}
	}

	async addDraw(dto: AddDrawDto) {
		try {
			const ExistingTitle = await this.prisma.draw.findFirst({
				where: {
					title: dto.title,
				},
			});

			if (ExistingTitle) {
				throw new CustomBadRequestException('THERE_IS_DRAW_WITH_THIS_NAME');
			}

			const draw = await this.prisma.draw.create({
				data: {
					title: dto.title,
					startDate: new Date(dto.startDate),
					endDate: new Date(dto.endDate),
					status: 'Scheduled',
				},
			});

			dto.prizes.map(
				async (prize) =>
					await this.prisma.draw_prizes.create({
						data: {
							draw_id: draw.id,
							name: prize.name,
							value: prize.value,
							winners_num: prize.winners,
						},
					}),
			);

			return draw;
		} catch (error) {
			handleException(error, dto);
		}
	}

	async getAllDraws(dto: GetDashboardClientsDto) {
		try {
			const { page = 1, pageItemsCount = 10, search } = dto;

			const where = search ? { title: { contains: search } } : {};
			const totalDraws = await this.prisma.draw.count();
			// 1️⃣ Count total filtered draws for pagination
			const totalFilteredDraws = await this.prisma.draw.count({ where });

			// 2️⃣ Fetch paginated draws with related data
			const draws = await this.prisma.draw.findMany({
				where: {
					...(dto.search && {
						title: {
							contains: dto.search,
						},
					}),
				},
				include: {
					draw_prizes: {
						include: {
							draw_winners: {
								include: { user: true },
							},
						},
					},
				},
				skip: (page - 1) * pageItemsCount,
				take: pageItemsCount,
				orderBy: { createdAt: 'desc' },
			});

			// 3️⃣ Global statistics
			const totalUsers = await this.prisma.walimah_users.count();
			const totalWinners = await this.prisma.draw_winners.count();

			return {
				draws,
				totalDraws,
				totalUsers,
				totalWinners,
				page,
				pageItemsCount,
				totalPages: Math.ceil(totalFilteredDraws / pageItemsCount),
			};
		} catch (error) {
			handleException(error, {});
		}
	}

	async executeDraw(dto: DrawIdentifier) {
		try {
			const ExistingDraw = await this.prisma.draw.findFirst({
				where: { id: dto.draw_id },
				include: { draw_prizes: true },
			});

			if (!ExistingDraw) {
				throw new CustomNotFoundException('DRAW_NOT_FOUND');
			}

			// 🚨 Find all users who already won in previous draws
			const previousWinners = await this.prisma.draw_winners.findMany({
				select: { user_id: true },
			});

			const excludedUserIds = new Set(previousWinners.map((w) => w.user_id));

			// Get all users who haven't won before
			const users = await this.prisma.walimah_users.findMany({
				where: {
					id: { notIn: Array.from(excludedUserIds) },
				},
			});

			if (users.length === 0) {
				throw new CustomBadRequestException('No eligible users available for draw');
			}

			const createdWinners = [];

			for (const prize of ExistingDraw.draw_prizes) {
				const availableUsers = [...users];
				const winners: number[] = [];

				for (let i = 0; i < prize.winners_num; i++) {
					if (availableUsers.length === 0) break;

					const randomIndex = Math.floor(Math.random() * availableUsers.length);
					const winner = availableUsers[randomIndex];

					winners.push(winner.id);
					availableUsers.splice(randomIndex, 1);
				}

				for (const userId of winners) {
					const winner = await this.prisma.draw_winners.create({
						data: {
							draw_prize_id: prize.id,
							user_id: userId,
						},
						include: {
							draw_prize: true,
							user: true,
						},
					});
					createdWinners.push(winner);
				}
			}

			await this.prisma.draw.update({
				where: { id: dto.draw_id },
				data: { status: 'Completed' },
			});

			return { message: 'Draw executed successfully', winners: createdWinners };
		} catch (error) {
			handleException(error, dto);
		}
	}

	async deleteDraw(dto: DrawIdentifier) {
		try {
			const ExistingDraw = await this.prisma.draw.findFirst({
				where: {
					id: dto.draw_id,
				},
			});

			if (!ExistingDraw) {
				throw new CustomNotFoundException('Draw not found!');
			}

			const deletedDraw = await this.prisma.draw.delete({
				where: {
					id: dto.draw_id,
				},
			});

			return deletedDraw;
		} catch (error) {
			handleException(error, dto);
		}
	}

	async addWalimahDashboardUser(dto: AddWalimahDashboardUserDto) {
		try {
			const ExistingUser = await this.prisma.walimah_dashboard_user.findFirst({
				where: {
					name: dto.name,
				},
			});

			if (ExistingUser) {
				throw new CustomBadRequestException('There is user with this name already');
			}

			const user = await this.prisma.walimah_dashboard_user.create({
				data: {
					name: dto.name,
					password: await hashPassword(dto.password),
				},
			});

			return 'User added successfully';
		} catch (error) {
			handleException(error, dto);
		}
	}

	async getAllWalimahDashboardUsers(dto: GetDashboardClientsDto) {
		try {
			const { page = 1, pageItemsCount = 10, search } = dto;

			const users = await this.prisma.walimah_dashboard_user.findMany({
				where: {
					name: {
						contains: dto.search,
					},
				},
				select: {
					id: true,
					name: true,
				},
				skip: (page - 1) * pageItemsCount,
				take: pageItemsCount,
				orderBy: { createdAt: 'desc' },
			});

			const totalFilteredUsers = await this.prisma.walimah_dashboard_user.count({
				where: {
					name: {
						contains: dto.search,
					},
				},
			});

			const totalUsers = await this.prisma.walimah_dashboard_user.count();
			return {
				users,
				totalUsers,
				page,
				pageItemsCount,
				totalPages: Math.ceil(totalFilteredUsers / pageItemsCount),
			};
		} catch (error) {
			handleException(error, {});
		}
	}

	async deleteWalimahDashboardUser(dto: UserIdentifier) {
		try {
			const ExistingUser = await this.prisma.walimah_dashboard_user.findFirst({
				where: {
					id: dto.user_id,
				},
			});

			if (!ExistingUser) {
				throw new CustomNotFoundException('User not found !');
			}

			const deletedUser = await this.prisma.walimah_dashboard_user.delete({
				where: {
					id: dto.user_id,
				},
				select: {
					name: true,
				},
			});

			return deletedUser;
		} catch (error) {
			handleException(error, {});
		}
	}

	async deleteAllCoupons() {
		try {
			const deletedCoupons = await this.prisma.coupons.deleteMany();
			return deletedCoupons;
		} catch (error) {
			handleException(error, {});
		}
	}

	async getDashboardUserProfile(userData: walimah_dashboard_user) {
		try {
			const user = await this.prisma.walimah_dashboard_user.findFirst({
				where: {
					id: userData.id,
				},
			});

			return user;
		} catch (error) {
			handleException(error, {});
		}
	}
}
