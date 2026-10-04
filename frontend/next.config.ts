import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Temporary: the shared link opens the demo while the production backend is
  // down (see second-brain FEAT-demo-route). Delete to restore `/` as the real app.
  async redirects() {
    return [{ source: "/", destination: "/demo", permanent: false }];
  },
};

export default nextConfig;
