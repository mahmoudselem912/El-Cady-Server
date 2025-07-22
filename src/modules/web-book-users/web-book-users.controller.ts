import { Body, Controller, Get, Post, Query, UseInterceptors } from '@nestjs/common';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { WebBookUsersService } from './web-book-users.service';
import { FileInterceptor, MemoryStorageFile, UploadedFile } from '@blazity/nest-file-fastify';
import { AddWebBookUserDto } from './dto';
import { successfulResponse } from 'src/utils/response.handler';
import { ClientIdentifier } from '../clients/dto';

@Controller('web-book-users')
@ApiTags('Web-Book-Users')
export class WebBookUsersController {
    constructor(private readonly webBookUsersService: WebBookUsersService) { }

    @ApiConsumes('multipart/form-data')
    @UseInterceptors(FileInterceptor('image'))
    @Post('add-webBook-user')
    async AddWebBookUser(@Body() dto: AddWebBookUserDto, @UploadedFile() file: MemoryStorageFile) {
        const data = await this.webBookUsersService.addWebBookUser(dto, file)
        return successfulResponse(data)
    }

    @Get('get-all-webBook-users')
    async GetAllUsers(@Query() dto: ClientIdentifier) {
        const data = await this.webBookUsersService.getAllUsers(dto)
        return successfulResponse(data)
    }

}
