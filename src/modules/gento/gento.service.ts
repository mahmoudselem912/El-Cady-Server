import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, ResendOtpDto, VerifyOtpDto } from './dto';
import { handleException } from 'src/utils/error.handler';
import { CustomBadRequestException, CustomNotFoundException } from 'src/utils/custom.exceptions';
import { MailService } from '../mail/mail.service';

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
			const ExistingEmail = await this.prisma.gento_users.findFirst({
				where: {
					email: dto.email,
				},
			});

			if (ExistingEmail) {
				throw new CustomBadRequestException('This Email is already declared');
			}

			const user = await this.prisma.gento_users.create({
				data: {
					firstName: dto.firstName,
					lastName: dto.lastName,
					email: dto.email,
				},
			});

			const otp = this.generateOtp();
			const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min

			await this.prisma.gento_users.update({
				where: { id: user.id },
				data: {
					otpCode: otp,
					otpExpiry: expiry,
				},
			});

			await this.mailService.sendOtp(dto.email, otp);
			return { message: 'User created / updated and OTP sent to email' };
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
}
