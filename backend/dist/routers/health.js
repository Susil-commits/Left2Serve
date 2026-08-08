import { router, publicProcedure } from '../trpc.js';
import { z } from 'zod';
export const healthRouter = router({
    check: publicProcedure.query(() => {
        return { status: 'ok', timestamp: new Date() };
    }),
    echo: publicProcedure
        .input(z.object({ text: z.string() }))
        .query(({ input }) => {
        return { echoed: input.text };
    }),
});
