import { initTRPC } from '@trpc/server';
import { CreateExpressContextOptions } from '@trpc/server/adapters/express';

// Define context type for tRPC
export const createContext = ({ req, res }: CreateExpressContextOptions) => {
  return {
    req,
    res,
    user: (req as any).user, // Assuming auth middleware injects this
  };
};

type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

// Example protected procedure if needed
// export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
//   if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
//   return next({ ctx: { user: ctx.user } });
// });
