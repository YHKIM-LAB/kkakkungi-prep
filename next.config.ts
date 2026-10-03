import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Node 24 can finish the detached TypeScript CLI process before its piped
  // output is collected. The compiler API provides the same strict check.
  experimental: {
    useTypeScriptCli: false,
  },
};

export default nextConfig;
