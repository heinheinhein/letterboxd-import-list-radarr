import { load } from "cheerio/slim";
import type { LetterboxdItem } from "./types";

export function getNumberOfPages(html: string): number {
    const $ = load(html);
    const { number } = $.extract({
        number: "li.paginate-page:last-child",
    });
    if (number === undefined) return 1;

    const numberOfPages = parseInt(number);
    return isNaN(numberOfPages) ? 1 : numberOfPages;
}

export function getFilmsOnPage(html: string): LetterboxdItem[] {
    const $ = load(html);
    const { films } = $.extract({
        films: [
            {
                selector: "div",
                value: (el) => {
                    const idString = $(el).attr("data-film-id");
                    const id = idString ? parseInt(idString) : undefined;
                    const link = $(el).attr("data-item-link");
                    return { id, link };
                },
            },
        ],
    });

    return films.filter((item): item is LetterboxdItem => {
        if (item.id === undefined || isNaN(item.id) || item.link === undefined) {
            return false;
        }
        return true;
    });
}

export function extractTmdbId(html: string): number | null {
    const $ = load(html);
    const { tmdbId } = $.extract({
        tmdbId: {
            selector: 'a[data-track-action="TMDB"]',
            value: (el) => {
                const link = $(el).attr("href");
                if (link === undefined) return undefined;
                const idString = link.replace("https://www.themoviedb.org/movie/", "").replace("/", "");
                const id = parseInt(idString);
                return id;
            },
        },
    });

    return tmdbId === undefined || isNaN(tmdbId) ? null : tmdbId;
}
