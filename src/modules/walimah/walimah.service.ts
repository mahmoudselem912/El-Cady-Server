import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import OpenAI from 'openai';
import { MemoryStorageFile } from '@blazity/nest-file-fastify';
import { CustomBadRequestException, CustomNotFoundException } from 'src/utils/custom.exceptions';
import { handleException } from 'src/utils/error.handler';
import { AddUserDto, checkUserCodeDto, UploadCouponsSheetDto, UploadDto, UserIdentifier } from './dto';
import { addPathToFiles, saveFilesOnServer } from 'src/utils/file.handler';
import { ConfigService } from '@nestjs/config';
import * as XLSX from 'xlsx';

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
}
