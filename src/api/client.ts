type ApiClient = {
	query(body: unknown[]): Promise<unknown>;
};

export function createApiClient(env: Env): ApiClient {
	const baseUrl = env.EFFICY_URL;
	const apiKey = env.EFFICY_APIKEY;
	const customer = env.EFFICY_CUSTOMER;

	return {
		async query(body: unknown[]): Promise<unknown> {
			const response = await globalThis.fetch(baseUrl, {
				method: "POST",
				headers: {
					'X-Efficy-Customer': customer,
					"X-Efficy-ApiKey": apiKey,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(body),
			});

			if (!response.ok) {
				throw new Error(`API error: ${response.status} ${response.statusText}`);
			}

			return response.json();
		},
	};
}