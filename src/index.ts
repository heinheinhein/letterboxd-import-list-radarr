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
        return new Response(`Internal error: ${error.message}`, { status: 500 });
    },
});

logger.info(`Listening on http://${server.hostname}:${server.port}`);

async function handleRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;
    logger.info(`${req.method} ${path}`);

    const html = await fetchHtml(path);

    const numberOfPages = getNumberOfPages(html);
    logger.debug(`List ${path} has ${numberOfPages} page(s)`);

    let letterboxdItems: LetterboxdItem[];

    if (numberOfPages === 1) {
        letterboxdItems = getFilmsOnPage(html);
    } else {
        const paths = Array.from(Array(numberOfPages).keys(), (index) => `${path}/page/${index + 1}`);

        const pagePromises = paths.map(async (p, index) => {
            // html for the first page is already fetched
            if (index === 0) {
                const filmsOnPage = getFilmsOnPage(html);
                logger.debug(`Found ${filmsOnPage.length} film(s) on page ${p}`);
                return filmsOnPage;
            }
            const filmsOnPage = getFilmsOnPage(await fetchHtml(p));
            logger.debug(`Found ${filmsOnPage.length} film(s) on page ${p}`);
            return filmsOnPage;
        });

        const pages = await Promise.all(pagePromises);
        letterboxdItems = pages.flat(1);
    }

    // filter duplicate films out
    letterboxdItems = [...new Map(letterboxdItems.map((item) => [item.id, item])).values()];

    const importList = (await Promise.all(letterboxdItems.map(getTmdbId)))
        .filter((id) => id !== null)
        .map((id) => ({ id }));
    logger.debug(`Matched ${importList.length} TMDB id(s) for list ${path}`);

    if (importList.length === 0) {
        const searchParams = new URL(req.url).searchParams;
        if (!searchParams.has("allow-empty-list")) {
            logger.error(`Found 0 films in list ${path} and \`?allow-empty-list\` is not set`);
            return new Response(
                "Internal error: Found 0 films in list. If this is expected consider appending `?allow-empty-list` to the request URL to prevent future errors.",
                { status: 500 },
            );
        }
    }

    return Response.json(importList);
}
