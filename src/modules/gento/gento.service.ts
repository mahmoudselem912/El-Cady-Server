import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, ResendOtpDto, VerifyOtpDto } from './dto';
import { handleException } from 'src/utils/error.handler';
import { CustomBadRequestException, CustomNotFoundException } from 'src/utils/custom.exceptions';
import { MailService } from '../mail/mail.service';
import * as XLSX from 'xlsx';
import { FastifyReply } from 'fastify';

@Injectable()
export class GentoService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly mailService: MailService,
	) {}

	private generateOtp(): string {
		return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
	}
	async createUser(dto: CreateUserDto) {
		try {
			// 1. Check if user already exists
			let user = await this.prisma.gento_users.findFirst({
				where: { email: dto.email },
			});

			// 2. Generate OTP and expiry
			const otp = this.generateOtp();
			const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

			if (user) {
				// ✅ Update OTP for existing user
				await this.prisma.gento_users.update({
					where: { id: user.id },
					data: {
						otpCode: otp,
						otpExpiry: expiry,
					},
				});
			} else {
				// ✅ Create new user and set OTP
				user = await this.prisma.gento_users.create({
					data: {
						firstName: dto.firstName,
						lastName: dto.lastName,
						email: dto.email,
						otpCode: otp,
						otpExpiry: expiry,
					},
				});
			}

			// 3. Send OTP by email
			await this.mailService.sendOtp(dto.email, otp);

			return { message: 'OTP sent to email successfully' };
		} catch (error) {
			handleException(error, dto);
		}
	}

	async verifyOtp(dto: VerifyOtpDto) {
		const user = await this.prisma.gento_users.findFirst({ where: { email: dto.email } });

		if (!user) throw new CustomNotFoundException('User not found');

		if (!user.otpCode || !user.otpExpiry) {
			throw new CustomBadRequestException('No OTP generated');
		}

		if (user.otpCode !== dto.otp) {
			throw new CustomBadRequestException('Invalid OTP');
		}

		if (new Date() > user.otpExpiry) {
			throw new CustomBadRequestException('OTP expired');
		}

		// Optionally clear OTP after success
		await this.prisma.gento_users.update({
			where: { id: user.id },
			data: { otpCode: null, otpExpiry: null },
		});

		return { message: 'OTP verified successfully' };
	}

	async resendOtp(dto: ResendOtpDto) {
		const user = await this.prisma.gento_users.findFirst({ where: { email: dto.email } });

		if (!user) throw new CustomNotFoundException('User not found');

		const otp = this.generateOtp();
		const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min

		await this.prisma.gento_users.update({
			where: { id: user.id },
			data: { otpCode: otp, otpExpiry: expiry },
		});

		await this.mailService.sendOtp(dto.email, otp);

		return { message: 'OTP resent successfully' };
	}

	async getAllGentoUsers() {
		try {
			const users = await this.prisma.gento_users.findMany();
			return users;
		} catch (error) {
			handleException(error, {});
		}
	}

	async exportUsersToExcel(reply: FastifyReply) {
		// 1️⃣ Fetch users
		const users = await this.prisma.gento_users.findMany({
			select: {
				id: true,
				firstName: true,
				lastName: true,
				email: true,
			},
			orderBy: { id: 'asc' },
		});

		// 2️⃣ Map data for Excel
		const data = users.map((u, index) => ({
			ID: index + 1, // incremental id in the sheet
			'First Name': u.firstName,
			'Last Name': u.lastName,
			Email: u.email,
		}));

		// 3️⃣ Create a worksheet & workbook
		const worksheet = XLSX.utils.json_to_sheet(data);
		const workbook = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');

		// 4️⃣ Generate buffer
		const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

		// 5️⃣ Send file via Fastify
		reply
			.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
			.header('Content-Disposition', 'attachment; filename="GentoUsers.xlsx"')
			.send(buffer);
	}
}
