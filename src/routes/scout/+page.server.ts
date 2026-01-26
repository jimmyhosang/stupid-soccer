import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const session = await locals.getSession();

	if (!session) {
		throw redirect(303, '/login?redirect=/scout');
	}

	const userId = session.user.id;

	// Fetch user's profile (for scout usage info)
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('ai_scout_uses_this_month, ai_scout_reset_at, subscription_tier')
		.eq('id', userId)
		.single();

	// Check if monthly reset is needed
	if (profile?.ai_scout_reset_at) {
		const resetDate = new Date(profile.ai_scout_reset_at);
		const now = new Date();
		const monthDiff = (now.getFullYear() - resetDate.getFullYear()) * 12 + (now.getMonth() - resetDate.getMonth());

		// If more than a month has passed, reset the counter
		if (monthDiff >= 1) {
			await locals.supabase
				.from('profiles')
				.update({
					ai_scout_uses_this_month: 0,
					ai_scout_reset_at: now.toISOString()
				})
				.eq('id', userId);

			// Update local profile data for this request
			profile.ai_scout_uses_this_month = 0;
		}
	}

	const maxUses = profile?.subscription_tier === 'manager_club' ? Infinity : 1;
	const usesRemaining = maxUses - (profile?.ai_scout_uses_this_month || 0);

	return {
		profile: {
			usesRemaining: usesRemaining === Infinity ? 'Unlimited' : usesRemaining,
			subscriptionTier: profile?.subscription_tier || 'free'
		}
	};
};
