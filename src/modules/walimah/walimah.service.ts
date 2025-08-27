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
	checkUserCodeDto,
	UploadCouponsSheetDto,
	UploadDto,
	UserIdentifier,
} from './dto';
import { addPathToFiles, saveFilesOnServer } from 'src/utils/file.handler';
import { ConfigService } from '@nestjs/config';
import * as XLSX from 'xlsx';
import { DrawIdentifier } from './dto/draw-identifier';

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
						precentage: row[2]?.toString().trim(), // Column C
						startDate: new Date(row[3]), // Column D
						endDate: new Date(row[4]), // Column E
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
			const ExistingUser = await this.prisma.walimah_users.findFirst({
				where: {
					id: dto.user_id,
				},
			});

			if (!ExistingUser) {
				throw new CustomNotFoundException('User not found!');
			}

			// 1️⃣ Count coupons
			const totalCoupons = await this.prisma.coupons.count();
			if (totalCoupons === 0) {
				throw new CustomNotFoundException('No coupons available');
			}

			// 2️⃣ Pick a random offset
			const randomIndex = Math.floor(Math.random() * totalCoupons);

			// 3️⃣ Fetch one random coupon
			const randomCoupon = await this.prisma.coupons.findFirst({
				skip: randomIndex,
				take: 1,
			});

			if (!randomCoupon) {
				throw new CustomNotFoundException('Failed to select coupon');
			}

			// 4️⃣ Assign to user
			await this.prisma.user_Coupons.create({
				data: {
					user_id: ExistingUser.id,
					coupon_id: randomCoupon.id,
				},
				include: {
					coupon: true,
				},
			});

			return randomCoupon;
		} catch (error) {
			handleException(error, dto);
		}
	}

	async getDashboardClients() {
		try {
			const users = await this.prisma.walimah_users.findMany({
				include: {
					user_Coupons: true,
					walimah_users_bills: true,
				},
			});

			// build a lookup: usedCode → how many times it was used
			const usageMap: Record<string, number> = {};
			for (const u of users) {
				if (u.usedCode) {
					usageMap[u.usedCode] = (usageMap[u.usedCode] || 0) + 1;
				}
			}

			// enrich each user with how many times his code was shared
			const enrichedUsers = users.map((u) => ({
				...u,
				sharedCount: u.code ? usageMap[u.code] || 0 : 0,
			}));

			// global counts
			const totalUsers = users.length;
			const sharedUsersCount = enrichedUsers.filter((u) => u.sharedCount > 0).length;
			const winnersCount = enrichedUsers.filter((u) => u.user_Coupons.length > 0).length;

			return {
				users: enrichedUsers,
				totalUsers,
				sharedUsersCount, // users whose code was shared at least once
				winnersCount,
			};
		} catch (error) {
			handleException(error, {});
		}
	}

	async getDashboardCoupons() {
		try {
			// 1. Get all coupons with their user_Coupons
			const coupons = await this.prisma.coupons.findMany({
				include: {
					user_Coupons: true,
				},
			});

			// 2. Total coupons count
			const totalCoupons = coupons.length;

			// 3. Total redemptions (number of user_Coupons records)
			const totalRedemptions = coupons.reduce((acc, c) => acc + c.user_Coupons.length, 0);

			// 4. Active coupons (those used at least once)
			const activeCouponsCount = coupons.filter((c) => c.user_Coupons.length > 0).length;

			// 5. Average redemption rate
			const avgRedemptionRate = totalCoupons > 0 ? totalRedemptions / totalCoupons : 0;

			return {
				coupons,
				totalCoupons,
				activeCouponsCount,
				totalRedemptions,
				avgRedemptionRate,
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
					startDate: new Date(dto.startDate),
					endDate: new Date(dto.endDate),
					precentage: dto.percentage,
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

	async getAllDraws() {
		try {
			const draws = await this.prisma.draw.findMany({
				include: {
					draw_prizes: {
						include: {
							draw_winners: {
								include: {
									user: true,
								},
							},
						},
					},
				},
			});

			const totalUsers = await this.prisma.walimah_users.count();
			const totalWinners = await this.prisma.draw_winners.count();

			return { draws, totalUsers, totalWinners };
		} catch (error) {
			handleException(error, {});
		}
	}

	async executeDraw(dto: DrawIdentifier) {
		try {
			const ExistingDraw = await this.prisma.draw.findFirst({
				where: {
					id: dto.draw_id,
				},
				include: {
					draw_prizes: true,
				},
			});

			if (!ExistingDraw) {
				throw new CustomNotFoundException('DRAW_NOT_FOUND');
			}

			const users = await this.prisma.walimah_users.findMany();
			if (users.length === 0) throw new CustomBadRequestException('No users available for draw');

			const createdWinners = [];

			// For each prize, pick winners
			for (const prize of ExistingDraw.draw_prizes) {
				const availableUsers = [...users]; // clone
				const winners: number[] = [];

				for (let i = 0; i < prize.winners_num; i++) {
					if (availableUsers.length === 0) break;

					// pick random index
					const randomIndex = Math.floor(Math.random() * availableUsers.length);
					const winner = availableUsers[randomIndex];

					winners.push(winner.id);
					availableUsers.splice(randomIndex, 1);
				}

				// Save winners
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

			// Update draw status
			await this.prisma.draw.update({
				where: { id: dto.draw_id },
				data: { status: 'Completed' },
			});

			return { message: 'Draw executed successfully', winners: createdWinners };
		} catch (error) {
			handleException(error, dto);
		}
	}
}
