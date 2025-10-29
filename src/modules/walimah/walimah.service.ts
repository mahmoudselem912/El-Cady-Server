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
	AddWalimahCountryDto,
	AddWalimahDashboardUserDto,
	checkUserCodeDto,
	ExportUploadBillsHistoryDto,
	GetDashboardClientsDto,
	GetStatisticsDto,
	GetUsersByCouponCompany,
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
import { ExcelService } from '../excel/excel.service';
// import pdfParse from 'pdf-parse';
import { fromPath, fromBuffer } from 'pdf2pic';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';
const vision = require('@google-cloud/vision');

@Injectable()
export class WalimahService {
	private readonly openai: OpenAI;
	private readonly client: any;

	constructor(
		private readonly prisma: PrismaService,
		private readonly config: ConfigService,
		private readonly excelService: ExcelService,
	) {
		this.openai = new OpenAI({
			apiKey: config.get('OPEN_AI_KEY'),
		});

		this.client = new vision.ImageAnnotatorClient();
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

	// private parseResponse(raw: string): any {
	// 	try {
	// 		const json = raw.replace(/```(json)?/g, '').trim();
	// 		return JSON.parse(json);
	// 	} catch (e) {
	// 		return {
	// 			error: {
	// 				message: 'INVALID_JSON_RESPONSE',
	// 				status: 500,
	// 			},
	// 		};
	// 	}
	// }

	// private async useOpenAI(base64ImageString: string) {
	// 	const prompt = `
	// أنت خبير في تحليل فواتير المشتريات. المطلوب منك:

	// 1. استخراج تاريخ الفاتورة بصيغة yyyy-mm-dd.
	// 2. استخراج رقم الفاتورة.
	// 3. تحديد ما إذا كانت الفاتورة حقيقية (صادرة من نظام نقاط بيع رسمي).
	// 4. التحقق مما إذا كانت الفاتورة تحتوي على منتج يتعلق بـ "أرز الوليمة".
	//    - المنتج يُعتبر "أرز الوليمة" إذا احتوى اسمه على كلمتين تدلان على:
	//      • كلمة "الوليمة" أو "WALIMAH"
	//      • كلمة "أرز" أو "RICE"
	//    - الكلمات قد تأتي بأي ترتيب أو مع أوصاف إضافية مثل: "أرز الوليمة"، "الوليمة أرز بسمتي"، "AL WALIMAH SELLA R"، "الوليمة أرز كبير".
	//    - المهم أن تكون الكلمتان موجودتان معًا في اسم المنتج.
	// 5. إذا لم يظهر في الفاتورة أي منتج يحتوي على الكلمتين معًا، فاعتبر أنه غير موجود.

	// ### الشكل المطلوب للإجابة:

	// {
	//   "invoiceDate": "yyyy-mm-dd",
	//   "invoiceNumber": "رقم الفاتورة",
	//   "isReal": true,
	//   "hasRice": {
	//     "value": true,
	//     "reason": "الفاتورة تحتوي على بند باسم 'الوليمة ارز بسمتي'"
	//   }
	// }

	// إذا لم تتمكن من استخراج البيانات، ارجع النتيجة بهذا الشكل:

	// {
	//   "error": {
	//     "message": "DESCRIPTION_OF_THE_ERROR_IN_UPPER_CASE_UNDERSCORED",
	//     "status": 500
	//   }
	// }
	// `;

	// 	try {
	// 		const response = await this.openai.chat.completions.create({
	// 			model: 'gpt-4.1-nano',
	// 			messages: [
	// 				{
	// 					role: 'user',
	// 					content: [
	// 						{ type: 'text', text: prompt },
	// 						{
	// 							type: 'image_url',
	// 							image_url: {
	// 								url: base64ImageString,
	// 								detail: 'high',
	// 							},
	// 						},
	// 					],
	// 				},
	// 			],
	// 			max_tokens: 800,
	// 		});

	// 		console.log(`response: ${response}`);

	// 		const content = response.choices[0].message.content;
	// 		return this.parseResponse(content);
	// 	} catch (error) {
	// 		console.log(error);
	// 		return {
	// 			error: {
	// 				message: 'OPENAI_REQUEST_FAILED',
	// 				status: 500,
	// 			},
	// 		};
	// 	}
	// }

	// async analyzeAndSave(dto: UploadDto, file: MemoryStorageFile) {
	// 	try {
	// 		const ExistinUser = await this.prisma.walimah_users.findFirst({
	// 			where: {
	// 				id: dto.user_id,
	// 			},
	// 		});

	// 		if (!ExistinUser) {
	// 			throw new CustomNotFoundException('User not found!');
	// 		}

	// 		// if (!file.mimetype || !['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.mimetype)) {
	// 		// 	throw new CustomBadRequestException('Invalid image type');
	// 		// }

	// 		console.log(file);

	// 		const base64Image1 = Buffer.from(file.buffer).toString('base64');

	// 		// Prepend data URI scheme if needed (optional)
	// 		const dataURI = `data:${file.mimetype};base64,${base64Image1}`;

	// 		const result = await this.useOpenAI(file);

	// 		// Handle OpenAI errors
	// 		if (result?.error) {
	// 			throw new CustomBadRequestException(result.error.message);
	// 		}

	// 		const nestedFolder = `users/user-${ExistinUser.name.replaceAll(' ', '')}`;
	// 		const filesWithPathAndURl = await addPathToFiles([file], 'ElCady', nestedFolder);

	// 		if (result.hasRice.value) {
	// 			const ExistingBill = await this.prisma.walimah_users_bills.findFirst({
	// 				where: {
	// 					bill_number: result.invoiceNumber,
	// 				},
	// 			});

	// 			if (ExistingBill) {
	// 				throw new CustomBadRequestException('هذه الفاتورة تم رفعها بالفعل');
	// 			}
	// 		}

	// 		await this.prisma.walimah_users_bills.create({
	// 			data: {
	// 				walimah_user_id: dto.user_id,
	// 				bill_number: result?.invoiceNumber,
	// 				bill_image: filesWithPathAndURl[0].fileurl,
	// 			},
	// 		});

	// 		if (file)
	// 			try {
	// 				await saveFilesOnServer(filesWithPathAndURl);
	// 			} catch (error) {
	// 				await this.prisma.walimah_users.delete({
	// 					where: { id: ExistinUser.id },
	// 				});

	// 				throw new InternalServerErrorException(
	// 					'Error saving files while creating User',
	// 					(error as Error).message,
	// 				);
	// 			}

	// 		return result;
	// 	} catch (error) {
	// 		handleException(error, {});
	// 	}
	// }

	private parseResponse(raw: string): any {
		try {
			console.log(raw);
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

	private async useOpenAI(base64ImageString: string, isPdf: boolean = false) {
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
6. التزم بالشكل المطلوب للاجابة لا اريد اي شرح مختصر اخر
7. لا اريد اي ملاحظات فقط التزم بالشكل المطلوب للاجابة

### الشكل المطلوب للإجابة:

{
  "invoiceDate": "yyyy-mm-dd",
  "invoiceNumber": "رقم الفاتورة",
  "isReal": true,
  "hasRice": {
    "value": true,
    "reason": "الفاتورة تحتوي على بند باسم 'الوليمة ا	رز بسمتي'"
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
			// For PDFs, we need to use a different approach since GPT-4 can't directly read PDFs
			if (isPdf) {
				console.log('Start calling open ai for pdf');
				// You might need to convert PDF to images first for GPT-4 Vision
				// For now, we'll use text-based approach with regular GPT-4
				const base64Data = base64ImageString.replace(/^data:application\/pdf;base64,/, '');
				const tempPath = path.join(tmpdir(), `invoice-${Date.now()}.pdf`);
				fs.writeFileSync(tempPath, Buffer.from(base64Data, 'base64'));

				const file = await this.openai.files.create({
					file: fs.createReadStream(tempPath),
					purpose: 'assistants',
				});

				console.log('Done call assistant');

				const response = await this.openai.responses.create({
					model: 'gpt-4.1', // ✅ supports files + reasoning
					input: [
						{
							role: 'user',
							content: [
								{ type: 'input_text', text: prompt },
								{ type: 'input_file', file_id: file.id },
							],
						},
					],
				});

				let content = response.output_text ?? '';

				// if (!content && Array.isArray(response.output)) {
				// 	const message = response.output.find((item: any) => item.type === 'message');
				// 	if (message?.content?.[0]?.text) {
				// 		content = message.content[0].text;
				// 	}
				// }

				return this.parseResponse(content);
			} else {
				// Original image processing logic
				const response = await this.openai.chat.completions.create({
					model: 'gpt-4.1', // Use vision model for images
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
			}
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

	// Helper function to convert PDF to images (you'll need to implement this based on your PDF library)
	private async convertPdfToImages(pdfBuffer: Buffer): Promise<string[]> {
		// This is a placeholder - you'll need to implement PDF to image conversion
		// Using a library like pdf2pic, pdf-poppler, or similar
		// Return array of base64 encoded images
		throw new Error('PDF to image conversion not implemented');
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

			if (dto.file_name) {
				const ExistingBill = await this.prisma.walimah_users_bills.findFirst({
					where: {
						file_name: dto.file_name,
						approved: true,
					},
				});

				if (ExistingBill) {
					throw new CustomBadRequestException('هذه الفاتورة تم رفعها بالفعل');
				}
			}

			// Update allowed file types to include PDF
			const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
			if (!file.mimetype || !allowedMimeTypes.includes(file.mimetype)) {
				throw new CustomBadRequestException('Invalid file type. Only images and PDFs are allowed.');
			}

			console.log(file);

			let result;
			const isPdf = file.mimetype === 'application/pdf';

			if (isPdf) {
				// For PDFs, you have two options:

				// Option 1: Convert PDF to text and send as text (simpler but less accurate for formatted invoices)
				const pdfBuffer = file.buffer;
				const base64Pdf = pdfBuffer.toString('base64');
				result = await this.useOpenAI(base64Pdf, true);

				// Option 2: Convert PDF to images and process each page (more accurate but more complex)
				// const images = await this.convertPdfToImages(file.buffer);
				// // Process each image page and combine results
				// const results = [];
				// for (const image of images) {
				// 	const pageResult = await this.useOpenAI(image, false);
				// 	results.push(pageResult);
				// }
				// result = this.combinePdfResults(results);
			} else {
				// Original image processing
				const base64Image = Buffer.from(file.buffer).toString('base64');
				const dataURI = `data:${file.mimetype};base64,${base64Image}`;
				result = await this.useOpenAI(dataURI, false);
			}

			// Handle OpenAI errors
			if (result?.error) {
				throw new CustomBadRequestException(result.error.message);
			}

			const nestedFolder = `users/user-${ExistinUser.name.replaceAll(' ', '')}`;
			const filesWithPathAndURl = await addPathToFiles([file], 'ElCady', nestedFolder);

			const createdBill = await this.prisma.walimah_users_bills.create({
				data: {
					file_name: dto.file_name,
					walimah_user_id: dto.user_id,
					bill_number: result?.invoiceNumber,
					bill_image: filesWithPathAndURl[0].fileurl,
					result: result,
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

			if (result.hasRice.value) {
				const ExistingBill = await this.prisma.walimah_users_bills.findFirst({
					where: {
						bill_number: result?.invoiceNumber,
						approved: true,
					},
				});

				if (ExistingBill) {
					throw new CustomBadRequestException('هذه الفاتورة تم رفعها بالفعل');
				}

				await this.prisma.walimah_users_bills.update({
					where: {
						id: createdBill.id,
					},
					data: {
						approved: true,
					},
				});
			} else {
				await this.prisma.walimah_users_bills.update({
					where: {
						id: createdBill.id,
					},
					data: {
						approved: false,
					},
				});
			}

			// 👈 replace with your local file

			// Performs text detection

			// const [result2] = await this.client.textDetection('./uploads/' + filesWithPathAndURl[0].fileurl);
			// const detections = result2.textAnnotations;

			// console.log('Text:');
			// detections.forEach((text) => console.log(text.description));

			return result;
		} catch (error) {
			handleException(error, {});
		}
	}

	async addUser(dto: AddUserDto) {
		try {
			const ExistingUser = await this.prisma.walimah_users.findFirst({
				where: {
					number: dto.number.trim(),
				},
			});

			if (ExistingUser) {
				return { user: ExistingUser, type: 'exist' };
			} else {
				const code = await this.generateUniqueUserCode();

				if (dto.country_id) {
					const ExistingCountry = await this.prisma.walimah_country.findFirst({
						where: {
							id: dto.country_id,
						},
					});

					if (!ExistingCountry) {
						throw new CustomNotFoundException('Country not found!');
					}
				}

				const user = await this.prisma.walimah_users.create({
					data: {
						name: dto.name,
						city: dto.city,
						email: dto.email,
						number: dto.number.trim(),
						code: code,
						usedCode: dto.code,
						country_id: dto.country_id ? dto.country_id : null,
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

			// 7️⃣ Check available companies (skip empty ones) — with weighted randomness

			// Define weights (lower weight = less chance to appear)
			const companyWeights: Record<CouponCompany, number> = {
				[CouponCompany.Noon]: 5,
				[CouponCompany.SaifGallery]: 5,
				[CouponCompany.CuisinePlus]: 5,
				[CouponCompany.Platinum]: 4,
				[CouponCompany.PlatinumFixed100]: 0.05,
				[CouponCompany.PlatinumFixed150]: 0.05,
				[CouponCompany.PlatinumFixed200]: 0.05,
				[CouponCompany.PlatinumFixed300]: 0.05,
			};

			// Sort companies by usage (least used first)
			const sortedCompanies = allCompanies.sort((a, b) => usageMap[a] - usageMap[b]);

			// Filter only companies with available coupons
			const availableCompanies: { company: CouponCompany; weight: number }[] = [];
			for (const company of sortedCompanies) {
				const availableCount = await this.prisma.coupons.count({
					where: { company, user_Coupons: { none: {} } },
				});
				if (availableCount > 0) {
					availableCompanies.push({ company, weight: companyWeights[company] });
				}
			}

			if (availableCompanies.length === 0) {
				throw new CustomNotFoundException('All coupons have been used!');
			}

			// Weighted random selection
			const totalWeight = availableCompanies.reduce((sum, c) => sum + c.weight, 0);
			let random = Math.random() * totalWeight;

			let availableCompany: CouponCompany | null = null;
			for (const { company, weight } of availableCompanies) {
				if ((random -= weight) <= 0) {
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
					user_Coupons: {
						include: {
							coupon: true,
						},
					},
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

	async getStatitics(dto: GetStatisticsDto) {
		try {
			const totalCoupons = await this.prisma.coupons.count();

			// 2) Total coupons that are assigned to at least one user
			//    (coupons with user_Coupons.some exists)
			const totalCouponsAssigned = await this.prisma.coupons.count({
				where: {
					user_Coupons: {
						some: {}, // any relation -> counts that coupon
					},
				},
			});

			// 3) (Optional) total assignments in user_Coupons (how many user-coupon rows exist)
			const totalAssignments = await this.prisma.user_Coupons.count();

			// 4) Total coupons grouped by company (all coupons)
			const couponsByCompanyRaw = await this.prisma.coupons.groupBy({
				by: ['company'],
				_count: { id: true },
			});

			const couponsByCompany = couponsByCompanyRaw.reduce(
				(acc, item) => {
					acc[item.company] = item._count.id;
					return acc;
				},
				{} as Record<string, number>,
			);

			// 5) Assigned coupons grouped by company (count coupons per company that have at least one user relation)
			//    We can do this by grouping coupons but filtering where user_Coupons.some exists.
			const assignedByCompanyRaw = await this.prisma.coupons.groupBy({
				by: ['company'],
				where: {
					user_Coupons: { some: {} },
				},
				_count: { id: true },
			});

			const assignedCouponsByCompany = assignedByCompanyRaw.reduce(
				(acc, item) => {
					acc[item.company] = item._count.id;
					return acc;
				},
				{} as Record<string, number>,
			);

			// 6) Total clients
			const totalClients = await this.prisma.walimah_users.count();

			// 7) Total uploaded bills
			const totalBills = await this.prisma.walimah_users_bills.count();

			const totalUsersWonCoupons = await this.prisma.walimah_users.count({
				where: {
					user_Coupons: {
						some: {}, // user has at least one related coupon
					},
				},
			});

			const allUsers = await this.prisma.walimah_users.findMany({
				include: {
					user_Coupons: { include: { coupon: true } },
					walimah_users_bills: true,
				},
			});

			const allUsers2 = await this.prisma.walimah_users.findMany({
				include: {
					user_Coupons: {
						include: { coupon: true },
					},
					walimah_users_bills: true,
				},
				orderBy: { createdAt: 'desc' },
			});

			// 2️⃣ Build code usage map
			const usageMap: Record<string, number> = {};
			for (const u of allUsers) {
				if (u.usedCode) {
					usageMap[u.usedCode] = (usageMap[u.usedCode] || 0) + 1;
				}
			}

			const usageMap2: Record<string, number> = {};
			for (const u of allUsers2) {
				if (u.usedCode) {
					usageMap2[u.usedCode] = (usageMap2[u.usedCode] || 0) + 1;
				}
			}

			// const enrichedAllUsers = allUsers.map((u) => ({
			// 	...u,
			// 	sharedCount: u.code ? usageMap[u.code] || 0 : 0,
			// }));

			const enrichedAllUsers2 = allUsers2.map((u) => ({
				...u,
				sharedCount: u.code ? usageMap2[u.code] || 0 : 0,
			}));

			const sharedUsersCount = enrichedAllUsers2.filter((u) => u.sharedCount > 0).length;

			const sharedCounts = await this.prisma.walimah_users.groupBy({
				by: ['usedCode'],
				_count: { usedCode: true },
				where: { usedCode: { not: null } },
			});

			// Convert the counts into an easy lookup
			const sharedCountMap = sharedCounts.reduce(
				(acc, item) => {
					acc[item.usedCode] = item._count.usedCode;
					return acc;
				},
				{} as Record<string, number>,
			);

			// Aggregate data in JS
			const leaderboard = allUsers.map((user) => {
				const billsCount = user.walimah_users_bills.length;
				const couponsCount = user.user_Coupons.length;
				const sharedCount = sharedCountMap[user.code] || 0;

				return {
					id: user.id,
					name: user.name,
					billsCount,
					couponsCount,
					sharedCount,
				};
			});

			const page = dto.page ?? 1;
			const limit = dto.pageItemsCount ?? 10;
			const start = (page - 1) * limit;

			type SortableField = 'sharedCount' | 'couponsCount' | 'billsCount';
			const sortBy = (dto.sortBy ?? 'sharedCount') as SortableField;
			const sortOrder = dto.sortOrder ?? 'desc';

			const sorted = leaderboard.sort((a, b) => {
				const field = sortBy;
				const aVal = a[field] ?? 0;
				const bVal = b[field] ?? 0;

				return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
			});

			// 5️⃣ Apply pagination AFTER sorting
			const paginated = sorted.slice(start, start + limit);

			// Return top 10
			// const leaders = sorted.slice(0, 10);

			const freeCouponsByCompany: Record<string, number> = {};

			for (const [company, total] of Object.entries(couponsByCompany)) {
				const assigned = assignedCouponsByCompany[company] || 0;
				freeCouponsByCompany[company] = total - assigned;
			}

			const totalUsersUploadedBills = await this.prisma.walimah_users.count({
				where: {
					walimah_users_bills: {
						some: {}, // means user has at least one related bill
					},
				},
			});

			const countries = await this.prisma.walimah_country.findMany({
				select: {
					location: true,
					title: true,
					_count: {
						select: { walimah_users: true },
					},
				},
			});

			// Group by location and include city information
			const grouped = countries.reduce((acc: any, curr) => {
				const { location, title } = curr;
				const count = curr._count.walimah_users;

				if (!acc[location]) {
					acc[location] = {
						total: 0,
						cities: {},
					};
				}

				acc[location].total += count;

				// Aggregate city data
				if (title) {
					if (!acc[location].cities[title]) {
						acc[location].cities[title] = 0;
					}
					acc[location].cities[title] += count;
				}

				return acc;
			}, {});

			// Convert to array format with cities
			const result = Object.entries(grouped).map(([location, data]: [string, any]) => ({
				location,
				total: data.total,
				cities: data.cities,
			}));

			const visitors = await this.prisma.visitor.findMany({
				select: {
					createdAt: true,
					ip: true,
				},
			});

			// Group by date (yyyy-mm-dd) and count distinct IPs
			const groupedVisitors = visitors.reduce(
				(acc, v) => {
					const dateKey = v.createdAt.toISOString().split('T')[0];
					if (!acc[dateKey]) acc[dateKey] = new Set();
					acc[dateKey].add(v.ip);
					return acc;
				},
				{} as Record<string, Set<string>>,
			);

			const dailyStatistics = Object.entries(groupedVisitors)
				.map(([date, ips]) => ({
					date,
					visitors: ips.size,
				}))
				.sort((a, b) => a.date.localeCompare(b.date));

			const fromDate = dto.fromDate ? new Date(dto.fromDate) : new Date();
			const toDate = dto.toDate ? new Date(dto.toDate) : new Date();

			// Clone the dates before mutating
			const fromLocal = new Date(fromDate);
			fromLocal.setHours(0, 0, 0, 0);

			const toLocal = new Date(toDate);
			toLocal.setHours(23, 59, 59, 999);

			// UTC difference in minutes (example: 180 = +03:00)
			const utcOffsetMinutes = 180;

			// Subtract offset to get UTC time
			const fromDateUTC = new Date(fromLocal.getTime() - utcOffsetMinutes * 60 * 1000);
			const toDateUTC = new Date(toLocal.getTime() - utcOffsetMinutes * 60 * 1000);

			const users = await this.prisma.walimah_users.findMany({
				where: {
					createdAt: {
						gte: fromDateUTC,
						lte: toDateUTC,
					},
				},
			});

			const uploadedBills = await this.prisma.walimah_users_bills.findMany({
				where: {
					createdAt: {
						gte: fromDateUTC,
						lte: toDateUTC,
					},
				},
				include: {
					walimah_user: true,
				},
			});

			return {
				totalCoupons: totalCoupons - totalAssignments,
				totalCouponsAssigned,
				totalAssignments,
				couponsByCompany: freeCouponsByCompany,
				assignedCouponsByCompany,
				totalClients,
				totalUsersUploadedBills,
				totalBills,
				totalUsersWonCoupons,
				sharedUsersCount,
				leaders: paginated,
				page: dto.page || null,
				pageItemsCount: dto.pageItemsCount || null,
				totalPages: Math.ceil(leaderboard.length / limit),
				totalUsers: leaderboard.length,
				countriesStatistics: result,
				dailyStatistics,
				users,
				uploadedBills,
			};
		} catch (error) {
			handleException(error, {});
		}
	}

	async deleteExtraCoupons() {
		try {
			// Get all users, with their bills and coupons
			const users = await this.prisma.walimah_users.findMany({
				include: {
					walimah_users_bills: true,
					user_Coupons: true,
				},
			});

			let totalDeleted = 0;

			// Only include users who actually used coupons
			const usedUsers = users.filter((u) => u.usedCode !== null);

			for (const user of usedUsers) {
				const billsCount = user.walimah_users_bills.length;
				const couponsCount = user.user_Coupons.length;

				if (couponsCount > billsCount) {
					const extra = couponsCount - billsCount;

					const couponsToDelete = user.user_Coupons
						.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
						.slice(0, extra);

					const idsToDelete = couponsToDelete.map((c) => c.id);

					// Uncomment when ready
					await this.prisma.user_Coupons.deleteMany({
						where: { id: { in: idsToDelete } },
					});

					console.log(`User ${user.id}: coupons=${couponsCount}, bills=${billsCount}, deleted=${extra}`);

					totalDeleted += extra;
				}
			}

			console.log(`Total deleted coupons: ${totalDeleted}`);
			return totalDeleted;
		} catch (error) {
			handleException(error, {});
		}
	}

	async exportWalimahUsers() {
		try {
			const users = await this.prisma.walimah_users.findMany();
			const headers = ['ID', 'Name', 'Number', 'City', 'Email', 'Code', 'Register At'];
			const data = users.map((user) => [
				user.id,
				user.name ?? '',
				user.number ?? '',
				user.city ?? '',
				user.email ?? '',
				user.code ?? '',
				user.createdAt
					? new Date(user.createdAt).toLocaleString('en-US', {
							year: 'numeric',
							month: '2-digit',
							day: '2-digit',
							hour: '2-digit',
							minute: '2-digit',
							second: '2-digit',
							hour12: false,
						})
					: '',
			]);

			const excelLink = await this.excelService.createExcelFile(
				headers,
				data,
				`walimah-users-${new Date().toISOString()}.xlsx`,
			);

			return {
				message: 'Rewards exported successfully',
				excelLink,
			};
		} catch (error) {
			handleException(error, {});
		}
	}

	async getUsersByCouponCompany(dto: GetUsersByCouponCompany) {
		try {
			const users = await this.prisma.user_Coupons.findMany({
				where: {
					coupon: {
						company: dto.company,
					},
				},
				include: {
					user: true,
				},
			});

			return users;
		} catch (error) {
			handleException(error, dto);
		}
	}

	async giveMeNow() {
		try {
			const now = new Date();
			return now;
		} catch (error) {
			handleException(error, {});
		}
	}

	async exportUploadBillsHistory(dto: ExportUploadBillsHistoryDto) {
		try {
			const from = new Date(dto.from);
			const to = new Date(dto.to);

			// Set to start and end of day
			from.setHours(0, 0, 0, 0);
			to.setHours(23, 59, 59, 999);

			// Subtract 180 minutes (3 hours) from both
			from.setMinutes(from.getMinutes() - 180);
			to.setMinutes(to.getMinutes() - 180);

			const bills = await this.prisma.walimah_users_bills.findMany({
				where: {
					createdAt: {
						gte: from,
						lte: to,
					},
				},
				include: {
					walimah_user: true,
				},
			});

			const headers = [
				'Name',
				'Number',
				'City',
				'Email',
				'Code',
				'Bill Link',
				'Upload Date',
				'Status',
				'Response',
			];
			const data = bills.map((bill) => [
				bill.walimah_user.name ?? '',
				bill.walimah_user.number ?? '',
				bill.walimah_user.city ?? '',
				bill.walimah_user.email ?? '',
				bill.walimah_user.code ?? '',
				'https://core-api.kadi-odyssey.com/uploads/' + bill.bill_image,
				bill.createdAt ? new Date(new Date(bill.createdAt).getTime() + 180 * 60 * 1000) : '',
				bill.approved === null ? '' : bill.approved === true ? 'Approved' : 'Rejected',
				bill.result ?? '',
			]);

			const excelLink = await this.excelService.createExcelFile(
				headers,
				data,
				`walimah-bills-history-${new Date().toISOString()}.xlsx`,
			);

			return {
				message: 'Walimah bills history exported successfully',
				excelLink,
			};
		} catch (error) {
			handleException(error, {});
		}
	}

	async recordVisit(ip: string, fingerprint?: string) {
		// Check if visitor already exists today
		const startOfDay = new Date();
		startOfDay.setHours(0, 0, 0, 0);

		const existing = await this.prisma.visitor.findFirst({
			where: {
				ip,
				createdAt: {
					gte: startOfDay,
				},
			},
		});

		if (!existing) {
			await this.prisma.visitor.create({
				data: { ip, fingerprint },
			});
		}

		return 'success';
	}

	async getDailyUniqueVisitors() {
		const visitors = await this.prisma.visitor.findMany({
			select: {
				createdAt: true,
				ip: true,
			},
		});

		// Group by date (yyyy-mm-dd) and count distinct IPs
		const grouped = visitors.reduce(
			(acc, v) => {
				const dateKey = v.createdAt.toISOString().split('T')[0];
				if (!acc[dateKey]) acc[dateKey] = new Set();
				acc[dateKey].add(v.ip);
				return acc;
			},
			{} as Record<string, Set<string>>,
		);

		return Object.entries(grouped)
			.map(([date, ips]) => ({
				date,
				visitors: ips.size,
			}))
			.sort((a, b) => a.date.localeCompare(b.date));
	}

	async addCountry(dto: AddWalimahCountryDto) {
		try {
			const ExistingCountry = await this.prisma.walimah_country.findFirst({
				where: {
					title: dto.title,
				},
			});

			if (ExistingCountry) {
				throw new CustomBadRequestException('Country with title already exist');
			}

			const country = await this.prisma.walimah_country.create({
				data: {
					title: dto.title,
					title_en: dto.title_en,
					location: dto.location,
				},
			});

			return country;
		} catch (error) {
			handleException(error, dto);
		}
	}

	async getAllCountries() {
		try {
			const countries = await this.prisma.walimah_country.findMany();
			return countries;
		} catch (error) {
			handleException(error, {});
		}
	}

	async exportAllCountries() {
		try {
			const countries = await this.prisma.walimah_country.findMany();
			const headers = ['ID', 'Name'];
			const data = countries.map((country) => [country.id, country.title ?? '']);

			const excelLink = await this.excelService.createExcelFile(
				headers,
				data,
				`walimah-cities-${new Date().toISOString()}.xlsx`,
			);

			return {
				message: 'Rewards exported successfully',
				excelLink,
			};
		} catch (error) {
			handleException(error, {});
		}
	}

	async updateCountrySheet(dto: UploadCouponsSheetDto, file: MemoryStorageFile) {
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
			dataRows.map(async (row: any[]) => {
				const ExistingCountry = await this.prisma.walimah_country.findFirst({
					where: {
						id: +row[0]?.toString().trim(),
					},
				});

				if (ExistingCountry) {
					await this.prisma.walimah_country.update({
						where: {
							id: ExistingCountry.id,
						},
						data: {
							title_en: row[2]?.toString().trim(),
						},
					});
				}
			});

			return { success: true };
		} catch (error) {
			handleException(error, dto);
		}
	}

	async updateUsersCountry(dto: UploadCouponsSheetDto, file: MemoryStorageFile) {
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
			dataRows.map(async (row: any[]) => {
				const ExistingUser = await this.prisma.walimah_users.findFirst({
					where: {
						id: +row[0]?.toString().trim(),
					},
				});

				if (ExistingUser) {
					await this.prisma.walimah_users.update({
						where: {
							id: ExistingUser.id,
						},
						data: {
							country_id: +row[3]?.toString().trim(),
						},
					});
				}
			});

			return { success: true };
		} catch (error) {
			handleException(error, dto);
		}
	}
}
