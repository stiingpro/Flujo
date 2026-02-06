import posthog from 'posthog-js';

// Initialize PostHog only if we are on the client side
export const initAnalytics = () => {
    if (typeof window !== 'undefined') {
        // Check if env vars are present, otherwise log warning or run in debug mode
        const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
        const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

        if (POSTHOG_KEY) {
            posthog.init(POSTHOG_KEY, {
                api_host: POSTHOG_HOST,
                // Disable automatic pageview capture if we want manual control, 
                // but for Next.js app router it's usually fine to leave default or use a specific pageview hook
                capture_pageview: false,
                persistence: 'localStorage',
                loaded: (posthog) => {
                    if (process.env.NODE_ENV === 'development') {
                        // Optional: posthog.opt_out_capturing(); // Uncomment to disable in dev
                        console.log('PostHog loaded in dev mode');
                    }
                }
            });
        } else {
            console.warn('PostHog Key not found. Analytics disabled.');
        }
    }
};

export const logEvent = (name: string, properties?: Record<string, any>) => {
    if (typeof window !== 'undefined' && (window as any).posthog) {
        posthog.capture(name, properties);
    } else {
        console.log(`[Analytics] ${name}`, properties);
    }
};

export const identifyUser = (id: string, properties?: Record<string, any>) => {
    if (typeof window !== 'undefined' && (window as any).posthog) {
        posthog.identify(id, properties);
    }
};
