import { ConvexClient } from "convex-dev";
import { queryUsers, queryDevotionals, queryChallenges } from "./queries";

const convex = new ConvexClient({
  address: process.env.CONVEX_URL,
  key: process.env.CONVEX_KEY,
});

// Example endpoint using Convex
export const getUsers = async (req, res) => {
  const users = await queryUsers(convex);
  res.json(users);
};

// Additional setup omitted for brevity