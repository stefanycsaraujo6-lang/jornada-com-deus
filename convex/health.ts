import { query } from "./_generated/server";

/** Healthcheck para validar deploy e conexao do frontend. */
export const ping = query({
  args: {},
  handler: async () => ({
    ok: true,
    service: "jornada-com-deus",
    at: Date.now(),
  }),
});
