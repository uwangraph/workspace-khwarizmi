import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
	appId: 'com.khwarizmi.workspace',
	appName: 'Khwarizmi Workspace',
	webDir: 'build',
	server: {
		androidScheme: 'https'
	},
	plugins: {
		PushNotifications: {
			presentationOptions: ['badge', 'sound', 'alert']
		}
	}
};

export default config;
