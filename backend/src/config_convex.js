const { ConvexReactClient } = require("convex/react");

const convexClient = new ConvexReactClient(process.env.CONVEX_URL);

module.exports = convexClient;