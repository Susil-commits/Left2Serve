import { initTRPC } from '@trpc/server';
// Define context type for tRPC
export const createContext = ({ req, res }) => {
    return {
        req,
        res,
        user: req.user, // Assuming auth middleware injects this
    };
};
const t = initTRPC.context().create();
export const router = t.router;
export const publicProcedure = t.procedure;
// Example protected procedure if needed
// export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
//   if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
//   return next({ ctx: { user: ctx.user } });
// });
