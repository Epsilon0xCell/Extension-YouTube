/**
 * Utility functions for YouTube Music extension
 *
 * A reader should know before using anything here: as of the current
 * source, nothing in src/ calls the three helpers in this file. They
 * came over from the Spotify extension this project was adapted from,
 * where playback state used them, and my YouTube tools ended up taking
 * IDs straight from search results instead. I leave them because the
 * URL forms below are the ones a play-by-link tool would need, but
 * they are untested by any live path in this build.
 */

export function generateRandomString(length: number): string {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const values = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(values)
        // 256 does not divide evenly by 62, so the first characters in
        // the alphabet come up slightly more often than the last ones.
        // Fine for an opaque label, wrong for anything secret.
        .map(x => possible[x % possible.length])
        .join('');
}

/**
 * Formats a video URL or ID into a standard YouTube Music videoId format
 * @param input Video URL or ID
 * @returns Normalized videoId or null if invalid
 */
export function normalizeVideoId(input: string): string | null {
    if (!input) return null;

    // If it's already a valid video ID (typically 11 characters)
    if (/^[A-Za-z0-9_-]{11}$/.test(input)) {
        return input;
    }

    // Extract from YouTube/YouTube Music URLs. Two gaps I know about:
    // shorts and live URLs carry the ID in the path with no v= at all,
    // so they return null here, and the second pattern needs the v=
    // somewhere after the domain, so a bare youtu.be link only ever
    // matches the first pattern.
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|music\.youtube\.com\/watch\?v=)([A-Za-z0-9_-]{11})/,
        /(?:youtube\.com|music\.youtube\.com)\/.*[?&]v=([A-Za-z0-9_-]{11})/,
    ];

    for (const pattern of patterns) {
        const match = input.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }

    return null;
}

/**
 * Formats a playlist URL or ID into a standard YouTube Music playlistId format
 * @param input Playlist URL or ID
 * @returns Normalized playlistId or null if invalid
 */
export function normalizePlaylistId(input: string): string | null {
    if (!input) return null;

    // If it's already a valid playlist ID
    if (/^[A-Za-z0-9_-]{34}$/.test(input) || /^PL[A-Za-z0-9_-]{32}$/.test(input) || /^RD[A-Za-z0-9_-]{32}$/.test(input) || /^OL[A-Za-z0-9_-]{32}$/.test(input)) {
        return input;
    }

    // Extract from YouTube/YouTube Music playlist URLs
    const playlistPattern = /(?:youtube\.com|music\.youtube\.com)\/.*[?&]list=([A-Za-z0-9_-]{34}|PL[A-Za-z0-9_-]{32}|RD[A-Za-z0-9_-]{32}|OL[A-Za-z0-9_-]{32})/;
    const match = input.match(playlistPattern);

    if (match && match[1]) {
        return match[1];
    }

    return null;
}

// Common configuration for JSON parsing with more relaxed rules.
// This is shaped like an HTTP client transform config, and no HTTP
// client in the current source uses it: ytmusic-api does its own
// fetching. The cleanup below only removes trailing commas. A response
// broken in any other way still throws from the second parse.
export const laxJsonConfig = {
    transformResponse: [(data: string) => {
        try {
            return JSON.parse(data);
        } catch {
            // Some YouTube Music API responses might be malformed JSON
            // Try to clean it up and parse
            const cleaned = data
                .replace(/,\s*}/g, '}')
                .replace(/,\s*]/g, ']');
            return JSON.parse(cleaned);
        }
    }],
};
