import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Redirect /trade to /marketplace for backwards compatibility
export const load: PageServerLoad = async () => {
	redirect(301, '/marketplace');
};
