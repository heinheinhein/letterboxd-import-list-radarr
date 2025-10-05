import robotsParser from "robots-parser";
import pThrottle from "p-throttle";
import packageJson from "../package.json";
import { logger } from "./logger";

const throttle = pThrottle({
    limit: 20,
    interval: 1000,
});

const userAgent = `${packageJson.name}/${packageJson.version} +${packageJson.homepage}`;
const fetchOptions: RequestInit = {
    headers: {
        "User-Agent": userAgent,
    },
};

const baseUrl = "https://letterboxd.com";
const robotsUrl = `${baseUrl}/robots.txt`;
const robotsTxt = await (await fetch(robotsUrl, fetchOptions)).text();

const robots = robotsParser(robotsUrl, robotsTxt);

async function _fetchHtml(path: string): Promise<string> {
    const url = baseUrl + path;

    if (robots.isDisallowed(url, userAgent)) {
        throw new Error("URL disallowed by robots.txt");
    }

    logger.debug(`Fetching ${url}`);
    const res = await fetch(url, fetchOptions);
    if (!res.ok) {
        logger.error(`Error fetching ${url}: ${res.status} ${res.statusText}`);
    }
    return res.text();
}

export const fetchHtml = throttle(_fetchHtml);
