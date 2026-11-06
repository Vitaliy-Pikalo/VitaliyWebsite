/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    // Old Netflix-era routes point to the matching section of the single-page site.
    const toSection = {
      "/browse": "/",
      "/profile/:name": "/",
      "/work-experience": "/#experience",
      "/projects": "/#projects",
      "/skills": "/#experience",
      "/certifications": "/#experience",
      "/contact-me": "/#contact",
      "/sports": "/#beyond",
      "/music": "/#beyond",
      "/reading": "/#beyond",
      "/blogs": "/",
      "/recommendations": "/",
      "/work-permit": "/",
    };
    return Object.entries(toSection).map(([source, destination]) => ({
      source,
      destination,
      permanent: true,
    }));
  },
};

export default nextConfig;
