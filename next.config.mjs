/** @type {import('next').NextConfig} */
const nextConfig = {
  logging: {
    // Every navigation also fetches the browser-tab icon, and each one was
    // printing a line of its own. It is generated, it is cached, and it has
    // never once been the thing worth looking at — so it is hidden and the
    // real pages keep their timings.
    incomingRequests: {
      ignore: [/^\/(icon|apple-icon)/],
    },
  },
};

export default nextConfig;
