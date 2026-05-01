const { ConvexReactClient } = require("convex/react");

// Configura cliente Convex
const convexClient = new ConvexReactClient("https://your.convex.cloud/api");

module.exports = convexClient;