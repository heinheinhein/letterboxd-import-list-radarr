import { getTmdbId } from "./cache";
import { fetchHtml } from "./fetch";
import { logger } from "./logger";
import { getFilmsOnPage, getNumberOfPages } from "./parse";
import type { LetterboxdItem } from "./types";

const server = Bun.serve({
    hostname: process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1",
    development: process.env.NODE_ENV !== "production",
    port: 3000,
    idleTimeout: 60,
    fetch: handleRequest,
    error(error) {
        logger.error(error.message);
        return new Response(`Internal error ${error.message}`, { status: 500 });
    },
});

logger.info(`Listening on http://${server.hostname}:${server.port}`);

async function handleRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;
    logger.info(`${req.method} ${path}`);

    if (path === "/" || path === "/favicon.ico") {
        return new Response(null, { status: 404 });
    }

    const html = await fetchHtml(path);

    const numberOfPages = getNumberOfPages(html);
    logger.debug(`List ${path} has ${numberOfPages} of pages`);

    let letterboxdItems: LetterboxdItem[];

    if (numberOfPages === 1) {
        letterboxdItems = getFilmsOnPage(html);
    } else {
        const paths = Array.from(Array(numberOfPages).keys(), (index) => `${path}/page/${index + 1}`);

        const pagePromises = paths.map(async (p, index) => {
            // html for the first page is already fetched
            if (index === 0) {
                const filmsOnPage = getFilmsOnPage(html);
                logger.debug(`Found ${filmsOnPage.length} films on page ${p}`);
                return filmsOnPage;
            }
            const filmsOnPage = getFilmsOnPage(await fetchHtml(p));
            logger.debug(`Found ${filmsOnPage.length} films on page ${p}`);
            return filmsOnPage;
        });

        const pages = await Promise.all(pagePromises);
        letterboxdItems = pages.flat(1);
    }

    const importList = (await Promise.all(letterboxdItems.map(getTmdbId)))
        .filter((id) => id !== null)
        .map((id) => ({ id }));
    logger.debug(`Mathed ${importList.length} TMDB ids for list ${path}`);

    return Response.json(importList);
}
