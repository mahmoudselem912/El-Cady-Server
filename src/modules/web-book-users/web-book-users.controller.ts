import { Body, Controller, Delete, Get, Post, Query, UseInterceptors } from '@nestjs/common';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { WebBookUsersService } from './web-book-users.service';
import { FileInterceptor, MemoryStorageFile, UploadedFile } from '@blazity/nest-file-fastify';
import { AddWebBookUserDto, UserIdentifier } from './dto';
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

    @Delete('delete-all-webBook-users')
    async DeleteAllWebBookUsers() {
        const data = await this.webBookUsersService.deleteAllUsers()
        return successfulResponse(data)
    }

    @Delete('delete-webBook-user')
    async DeleteWebBookUser(@Query() dto: UserIdentifier) {
        const data = await this.webBookUsersService.deleteUser(dto)
        return successfulResponse(data)
    }

}
