import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MemoryStorageFile } from '@blazity/nest-file-fastify';
import OpenAI from 'openai';
import { handleException } from 'src/utils/error.handler';
import { CustomBadRequestException } from 'src/utils/custom.exceptions';

@Injectable()
export class ChatBotService {
	private readonly openai: OpenAI;

	constructor(private readonly prisma: PrismaService) {
		this.openai = new OpenAI({
			apiKey: '',
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

	private async useOpenAI(base64Image: string) {
		const prompt = `
أنت خبير في تحليل فواتير المشتريات. المطلوب منك:

1. استخراج تاريخ الفاتورة بصيغة yyyy-mm-dd.
2. استخراج رقم الفاتورة.
3. تحديد ما إذا كانت الفاتورة حقيقية (صادرة من نظام نقاط بيع رسمي).
4. التحقق مما إذا كانت الفاتورة تحتوي على منتج يسمى "أرز الوليمة".

### الشكل المطلوب للإجابة:

{
  "invoiceDate": "yyyy-mm-dd",
  "invoiceNumber": "رقم الفاتورة",
  "isReal": true,
  "hasRice": {
    "value": true,
    "reason": "الفاتورة تحتوي على بند باسم 'أرز الوليمة'"
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
									url: `data:image/jpeg;base64,${base64Image}`,
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

	async analyzeAndSave(file: MemoryStorageFile) {
		try {
			if (!file.mimetype || !['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.mimetype)) {
				throw new CustomBadRequestException('Invalid image type');
			}
			const base64Image1 = Buffer.from(file.buffer['data']).toString('base64');
			// Prepend data URI scheme if needed (optional)
			const dataURI = `data:${file.mimetype};base64,${base64Image1}`;
			const result = await this.useOpenAI(dataURI);

			// Handle OpenAI errors
			if (result?.error) {
				throw new CustomBadRequestException(result.error.message);
			}

			console.log(result);

			return result;
		} catch (error) {
			handleException(error, {});
		}
	}
}
