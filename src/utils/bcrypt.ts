// import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';

const saltOrRounds = 10;

export const hashPassword = async (password: string) => {
	// const config = new ConfigService();
	// const salt = config.get('PASSWORD_SALT');
	// return await bcrypt.hash(password + salt, saltOrRounds);
	return await bcrypt.hash(password, saltOrRounds);
};

export const comparePassword = async (password: string, hashedPassword: string) => {
	// const config = new ConfigService();
	// // const salt = config.get('PASSWORD_SALT');
	// return await bcrypt.compare(password + salt, hashedPassword);
	return await bcrypt.compare(password, hashedPassword);
};
