import config from '@egomaw/eslint-config/typescript';

export default [
	...config,
	{
		ignores: ['vitest.config.ts'],
	},
	{
		languageOptions: {
			parserOptions: {
				project: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
	}
];
