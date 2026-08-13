import { initTRPC } from '@trpc/server';
export const createContext = ({ req, res }) => {
    return {
        req,
        res,
        user: req.user,
    };
};
const t = initTRPC.context().create();
export const router = t.router;
export const publicProcedure = t.procedure;
