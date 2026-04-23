/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@markflow/ui', '@markflow/shared-types', '@markflow/pdf-engine'],
};

export default nextConfig;
