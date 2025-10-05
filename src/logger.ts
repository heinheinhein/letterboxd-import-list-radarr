import adze, { setup } from "adze";

setup({
    activeLevel: process.env.NODE_ENV === "production" ? 6 : 7,
});

export const logger = adze.timestamp.seal();
