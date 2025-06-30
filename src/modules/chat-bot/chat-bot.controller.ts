import { FileInterceptor, MemoryStorageFile, UploadedFile } from '@blazity/nest-file-fastify';
import { Body, Controller, Post, UseInterceptors } from '@nestjs/common';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import * as mammoth from 'mammoth';
import { OpenAI } from 'openai';
import { AskDto, UploadDto } from './dto';
import { ChatBotService } from './chat-bot.service';
import { successfulResponse } from 'src/utils/response.handler';

@Controller('chat-bot')
@ApiTags('Chat-Bot')
export class ChatBotController {
	constructor(private readonly chatBotService: ChatBotService) {}

	@ApiConsumes('multipart/form-data')
	@UseInterceptors(FileInterceptor('file'))
	@Post('upload')
	async upload(@Body() dto: UploadDto, @UploadedFile() file: MemoryStorageFile) {
		const data = await this.chatBotService.analyzeAndSave(file);
		return successfulResponse(data)
	}
}
