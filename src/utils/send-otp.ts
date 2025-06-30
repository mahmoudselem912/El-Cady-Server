import axios from 'axios';

export async function sendOtp(
	phoneNumber: string,
	otpCode: string,
	api_key: string,
	api_secret: string,
): Promise<void> {
	const app_id = api_key;
	const app_sec = api_secret;
	const app_hash = Buffer.from(`${app_id}:${app_sec}`).toString('base64');

	const messages = {
		messages: [
			{
				text: `Your OTP code is: ${otpCode}`,
				numbers: [phoneNumber],
				sender: 'Qissah',
			},
		],
	};

	const url = 'https://api-sms.4jawaly.com/api/v1/account/area/sms/send';
	const headers = {
		Accept: 'application/json',
		'Content-Type': 'application/json',
		Authorization: `Basic ${app_hash}`,
	};

	try {
		const response = await axios.post(url, messages, { headers });
		console.log(response);
		const responseData = response.data;
		const statusCode = response.status;

		if (statusCode === 200 && !responseData['messages'][0]['err_text']) {
			console.log('OTP sent successfully. Job ID:', responseData['job_id']);
		} else {
			const errorMessage =
				responseData['messages'][0]['err_text'] || responseData['message'] || 'Failed to send OTP';
			console.error(errorMessage);
			throw new Error(errorMessage);
		}
	} catch (error) {
		console.log(error);
		console.error('Error sending OTP:', error.message || error);
		throw error;
	}
}
