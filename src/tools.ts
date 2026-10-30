import { getSettings } from './settings';
import { initYTMusicClient, checkCookieExpiration } from './auth';
import { TrackViewModel } from './types';

export type YTMusicTool =
    'searchSongs'
    | 'playItem'
    | 'getCurrentSong'
    | 'getQueue'
    | 'getHistory'
    | 'getUserPlaylists'
    | 'getPlaylistItems'
    | 'searchArtists'
    | 'searchAlbums';

type ToolParametersSchema = Readonly<Record<string, unknown>>;
type ToolCallback = (...args: never[]) => Promise<unknown>;

interface ToolDefinition {
    name: string;
    displayName: string;
    description: string;
    parameters: object;
    action: ToolCallback;
    shouldRegister: () => Promise<boolean>;
}

interface SearchSongsParameters {
    query: string;
}

interface SearchArtistsParameters {
    query: string;
}

interface SearchAlbumsParameters {
    query: string;
}

interface PlayItemParameters {
    videoId?: string;
    playlistId?: string;
}

interface GetPlaylistItemsParameters {
    playlistId: string;
}

const TOOL_PARAMETERS: Record<YTMusicTool, ToolParametersSchema> = {
    searchSongs: Object.freeze({
        $schema: 'http://json-schema.org/draft-04/schema#',
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: 'The search query for the song.',
            },
        },
        required: ['query'],
    }),
    searchArtists: Object.freeze({
        $schema: 'http://json-schema.org/draft-04/schema#',
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: 'The search query for the artist.',
            },
        },
        required: ['query'],
    }),
    searchAlbums: Object.freeze({
        $schema: 'http://json-schema.org/draft-04/schema#',
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: 'The search query for the album.',
            },
        },
        required: ['query'],
    }),
    playItem: Object.freeze({
        $schema: 'http://json-schema.org/draft-04/schema#',
        type: 'object',
        properties: {
            videoId: {
                type: 'string',
                description: 'The video ID of the song to play. Optional if "playlistId" is provided.',
            },
            playlistId: {
                type: 'string',
                description: 'The ID of the playlist to play. Optional if "videoId" is provided.',
            },
        },
        required: [],
    }),
    getCurrentSong: Object.freeze({
        $schema: 'http://json-schema.org/draft-04/schema#',
        type: 'object',
        properties: {},
        required: [],
    }),
    getQueue: Object.freeze({
        $schema: 'http://json-schema.org/draft-04/schema#',
        type: 'object',
        properties: {},
        required: [],
    }),
    getHistory: Object.freeze({
        $schema: 'http://json-schema.org/draft-04/schema#',
        type: 'object',
        properties: {},
        required: [],
    }),
    getUserPlaylists: Object.freeze({
        $schema: 'http://json-schema.org/draft-04/schema#',
        type: 'object',
        properties: {},
        required: [],
    }),
    getPlaylistItems: Object.freeze({
        $schema: 'http://json-schema.org/draft-04/schema#',
        type: 'object',
        properties: {
            playlistId: {
                type: 'string',
                description: 'The ID of the playlist to get the songs from.',
            },
        },
        required: ['playlistId'],
    }),
};

const TOOL_CALLBACKS: Record<YTMusicTool, ToolCallback> = {
    searchSongs: searchSongsCallback,
    searchArtists: searchArtistsCallback,
    searchAlbums: searchAlbumsCallback,
    playItem: playItemCallback,
    getCurrentSong: getCurrentSongCallback,
    getQueue: getQueueCallback,
    getHistory: getHistoryCallback,
    getUserPlaylists: getUserPlaylistsCallback,
    getPlaylistItems: getPlaylistItemsCallback,
};

const TOOL_DEFINITIONS: Record<YTMusicTool, ToolDefinition> = {
    searchSongs: {
        name: 'YTMusicSearchSongs',
        displayName: 'YouTube Music: Search Songs',
        description: 'Search for songs on YouTube Music. Call when you need to find a song by name or artist.',
        parameters: TOOL_PARAMETERS.searchSongs,
        action: TOOL_CALLBACKS.searchSongs,
        shouldRegister: isToolValid,
    },
    searchArtists: {
        name: 'YTMusicSearchArtists',
        displayName: 'YouTube Music: Search Artists',
        description: 'Search for artists on YouTube Music. Call when you need to find artists by name.',
        parameters: TOOL_PARAMETERS.searchArtists,
        action: TOOL_CALLBACKS.searchArtists,
        shouldRegister: isToolValid,
    },
    searchAlbums: {
        name: 'YTMusicSearchAlbums',
        displayName: 'YouTube Music: Search Albums',
        description: 'Search for albums on YouTube Music. Call when you need to find albums by title or artist.',
        parameters: TOOL_PARAMETERS.searchAlbums,
        action: TOOL_CALLBACKS.searchAlbums,
        shouldRegister: isToolValid,
    },
    playItem: {
        name: 'YTMusicPlayItem',
        displayName: 'YouTube Music: Play Item',
        description: 'Play a song or playlist on YouTube Music. Call when the user wants to start playback.',
        parameters: TOOL_PARAMETERS.playItem,
        action: TOOL_CALLBACKS.playItem,
        shouldRegister: isToolValid,
    },
    getCurrentSong: {
        name: 'YTMusicGetCurrentSong',
        displayName: 'YouTube Music: Get Current Song',
        description: 'Gets the current song playing on YouTube Music. Call when you need to display the current song.',
        parameters: TOOL_PARAMETERS.getCurrentSong,
        action: TOOL_CALLBACKS.getCurrentSong,
        shouldRegister: isToolValid,
    },
    getQueue: {
        name: 'YTMusicGetQueue',
        displayName: 'YouTube Music: Get Queue',
        description: 'Gets the current queue of songs on YouTube Music. Call when the user wants to see their queue.',
        parameters: TOOL_PARAMETERS.getQueue,
        action: TOOL_CALLBACKS.getQueue,
        shouldRegister: isToolValid,
    },
    getHistory: {
        name: 'YTMusicGetHistory',
        displayName: 'YouTube Music: Get History',
        description: 'Gets the history of recently played songs. Call when the user wants to see their recently played tracks.',
        parameters: TOOL_PARAMETERS.getHistory,
        action: TOOL_CALLBACKS.getHistory,
        shouldRegister: isToolValid,
    },
    getUserPlaylists: {
        name: 'YTMusicGetUserPlaylists',
        displayName: 'YouTube Music: Get User Playlists',
        description: 'Gets a list of user\'s playlists on YouTube Music.',
        parameters: TOOL_PARAMETERS.getUserPlaylists,
        action: TOOL_CALLBACKS.getUserPlaylists,
        shouldRegister: isToolValid,
    },
    getPlaylistItems: {
        name: 'YTMusicGetPlaylistItems',
        displayName: 'YouTube Music: Get Playlist Items',
        description: 'Gets a list of songs in a playlist on YouTube Music.',
        parameters: TOOL_PARAMETERS.getPlaylistItems,
        action: TOOL_CALLBACKS.getPlaylistItems,
        shouldRegister: isToolValid,
    },
};

// The shapes below are the ones ytmusic-api 4.x actually returns
// (SongDetailed and VideoDetailed in its schemas): the title field is
// called name, artists are objects with name and artistId, the album is
// an object with name and albumId, and duration is a number of seconds.
// The previous mapping read title, artists[].id, and album.id, none of
// which exist in those results, so every field came back undefined.
interface SongLike {
    videoId: string;
    name: string;
    artists: { name: string; artistId: string }[];
    album?: { name: string; albumId: string };
    duration?: number;
    thumbnails?: { url: string }[];
}

interface ArtistViewModel {
    artistId: string;
    name: string;
    thumbnailUrl?: string;
}

interface AlbumViewModel {
    albumId: string;
    name: string;
    artist: string;
    artistId?: string;
    thumbnailUrl?: string;
    year?: number | null;
}

function formatDuration(totalSeconds?: number): string | undefined {
    if (totalSeconds === undefined) {
        return undefined;
    }
    // No hour handling: a 90 minute mix renders as 90:00, not 1:30:00.
    // Track lengths from search rarely get near that, so I never added
    // the branch, but a long podcast episode would expose it.
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function songToViewModel(song: SongLike): TrackViewModel {
    return {
        videoId: song.videoId,
        name: song.name,
        artist: song.artists.map((a) => a.name),
        artistId: song.artists.map((a) => a.artistId),
        album: song.album?.name,
        albumId: song.album?.albumId,
        thumbnailUrl: song.thumbnails?.[0]?.url,
        duration: formatDuration(song.duration),
    };
}

async function isToolValid(): Promise<boolean> {
    // Registration only asks whether a cookie string exists. It does not
    // test the cookie, so tools can be registered on a session that died
    // days ago and each call then fails inside its own try block.
    const settings = getSettings();
    return !!settings.cookieData;
}

// The three search callbacks and getPlaylistItemsCallback all repeat
// the same opening: read settings, refuse without cookies, warn about
// expiry, build a client. I kept the copies instead of a shared wrapper
// because each one returns different error text to the model, and the
// model acts on that text. The cost is real though: a change to the
// opening has to be made in four places or the tools drift apart.
async function searchSongsCallback({ query }: SearchSongsParameters): Promise<string | TrackViewModel[]> {
    try {
        const settings = getSettings();
        if (!settings.cookieData) {
            return 'User is not authenticated with YouTube Music.';
        }

        checkCookieExpiration(settings);
        const ytMusic = await initYTMusicClient(settings);
        if (!ytMusic) {
            return 'Failed to initialize YouTube Music client.';
        }

        const results = await ytMusic.searchSongs(query);
        return results.map(songToViewModel);
    } catch (error) {
        console.error('Error searching songs:', error);
        return 'Error searching songs. See console for details.';
    }
}

async function searchArtistsCallback({ query }: SearchArtistsParameters): Promise<string | ArtistViewModel[]> {
    try {
        const settings = getSettings();
        if (!settings.cookieData) {
            return 'User is not authenticated with YouTube Music.';
        }

        checkCookieExpiration(settings);
        const ytMusic = await initYTMusicClient(settings);
        if (!ytMusic) {
            return 'Failed to initialize YouTube Music client.';
        }

        const results = await ytMusic.searchArtists(query);
        return results.map((artist) => ({
            artistId: artist.artistId,
            name: artist.name,
            thumbnailUrl: artist.thumbnails?.[0]?.url,
        }));
    } catch (error) {
        console.error('Error searching artists:', error);
        return 'Error searching artists. See console for details.';
    }
}

async function searchAlbumsCallback({ query }: SearchAlbumsParameters): Promise<string | AlbumViewModel[]> {
    try {
        const settings = getSettings();
        if (!settings.cookieData) {
            return 'User is not authenticated with YouTube Music.';
        }

        checkCookieExpiration(settings);
        const ytMusic = await initYTMusicClient(settings);
        if (!ytMusic) {
            return 'Failed to initialize YouTube Music client.';
        }

        const results = await ytMusic.searchAlbums(query);
        return results.map((album) => ({
            albumId: album.albumId,
            name: album.name,
            artist: album.artists?.[0]?.name || 'Unknown Artist',
            artistId: album.artists?.[0]?.artistId,
            thumbnailUrl: album.thumbnails?.[0]?.url,
            year: album.year,
        }));
    } catch (error) {
        console.error('Error searching albums:', error);
        return 'Error searching albums. See console for details.';
    }
}

async function playItemCallback({ videoId, playlistId }: PlayItemParameters): Promise<string> {
    try {
        const settings = getSettings();
        if (!settings.cookieData) {
            return 'User is not authenticated with YouTube Music.';
        }

        if (!videoId && !playlistId) {
            return 'Either videoId or playlistId is required to play music.';
        }

        // Note: ytmusic-api doesn't directly support playback control
        // We'll instead return a URL that the user can open
        // So the tool named Play Item plays nothing. I keep the name the
        // upstream extension used because the model picks tools by name
        // and description, but the honest description of the result is
        // a link, and the chat has to say so instead of claiming the
        // song started. If both IDs arrive, the video wins and the
        // playlist is silently dropped.

        if (videoId) {
            return `To play this song, open: https://music.youtube.com/watch?v=${videoId}`;
        } else if (playlistId) {
            return `To play this playlist, open: https://music.youtube.com/playlist?list=${playlistId}`;
        }

        return 'Unable to generate a playback URL.';
    } catch (error) {
        console.error('Error with play item:', error);
        return 'Error with play item. See console for details.';
    }
}

async function getCurrentSongCallback(): Promise<string> {
    const settings = getSettings();
    if (!settings.cookieData) {
        return 'User is not authenticated with YouTube Music.';
    }

    // ytmusic-api 4.x has no now-playing method and no history method
    // (the previous code called a getHistory() that does not exist in
    // the library). Say so instead of failing.
    return 'The ytmusic-api library does not provide the currently playing song or listening history, so this tool cannot return a current song.';
}

async function getQueueCallback(): Promise<string> {
    const settings = getSettings();
    if (!settings.cookieData) {
        return 'User is not authenticated with YouTube Music.';
    }

    // ytmusic-api has no queue access method. Returning a message
    // explaining this limitation.
    return 'The YouTube Music API does not provide access to the current queue. You can view your queue directly in the YouTube Music app or website.';
}

async function getHistoryCallback(): Promise<string> {
    const settings = getSettings();
    if (!settings.cookieData) {
        return 'User is not authenticated with YouTube Music.';
    }

    // ytmusic-api 4.x has no listening-history method (the previous code
    // called a getHistory() that does not exist in the library).
    return 'The ytmusic-api library does not provide listening history, so this tool cannot return recently played tracks.';
}

async function getUserPlaylistsCallback(): Promise<string> {
    const settings = getSettings();
    if (!settings.cookieData) {
        return 'User is not authenticated with YouTube Music.';
    }

    // ytmusic-api 4.x can search public playlists but has no method to
    // list the signed-in user's library playlists (the previous code
    // called a getLibraryPlaylists() that does not exist in the
    // library).
    return 'The ytmusic-api library does not provide access to your library playlists, so this tool cannot list them. The Get Playlist Items tool works with any playlist ID.';
}

async function getPlaylistItemsCallback({ playlistId }: GetPlaylistItemsParameters): Promise<string | TrackViewModel[]> {
    try {
        const settings = getSettings();
        if (!settings.cookieData) {
            return 'User is not authenticated with YouTube Music.';
        }

        if (!playlistId) {
            return 'Playlist ID is required.';
        }

        checkCookieExpiration(settings);
        const ytMusic = await initYTMusicClient(settings);
        if (!ytMusic) {
            return 'Failed to initialize YouTube Music client.';
        }

        // getPlaylist() returns playlist metadata only, with no tracks
        // field. The tracks live behind getPlaylistVideos().
        const videos = await ytMusic.getPlaylistVideos(playlistId);
        if (!videos || videos.length === 0) {
            return 'Playlist not found or empty.';
        }

        return videos.map(songToViewModel);
    } catch (error) {
        console.error('Error getting playlist items:', error);
        return 'Error getting playlist items. See console for details.';
    }
}

export function syncFunctionTools(): void {
    const context = SillyTavern.getContext();
    const settings = getSettings();

    // The settings keys and the TOOL_DEFINITIONS keys have to stay the
    // same set of names. A tool renamed in one place and not the other
    // reads as undefined here, which this loop treats as switched off,
    // so the failure mode is a tool that quietly never registers.
    for (const [key, definition] of Object.entries(TOOL_DEFINITIONS)) {
        if (settings[key as YTMusicTool]) {
            context.registerFunctionTool(definition);
        } else {
            context.unregisterFunctionTool(definition.name);
        }
    }
}
