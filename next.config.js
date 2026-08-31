/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_INSFORGE_URL: process.env.NEXT_PUBLIC_INSFORGE_URL || "https://6b4vx78a.ap-southeast.insforge.app",
    NEXT_PUBLIC_INSFORGE_ANON_KEY: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || "anon_14360467e7d161c0fc6f7d1fe89f5734195df8dcc04cc6c5cd8699a10750dfee",
    INSFORGE_URL: process.env.INSFORGE_URL || "https://6b4vx78a.ap-southeast.insforge.app",
    INSFORGE_API_KEY: process.env.INSFORGE_API_KEY || "ik_2063fcb27fb65c187f0aca0051c03ab9",
    NEXT_PUBLIC_DEV_OTP_MODE: process.env.NEXT_PUBLIC_DEV_OTP_MODE || "true",
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || "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",
    CRON_SECRET: process.env.CRON_SECRET || "813e7c7216253b1fcf83cd03b89b31eb5361508dc3252e8280029feabc22f84f",
  },
};

module.exports = nextConfig;


