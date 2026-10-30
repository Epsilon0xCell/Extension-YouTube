export interface TrackViewModel {
    videoId: string;
    name: string;
    // The union is wider than reality: songToViewModel in tools.ts
    // always fills artist and artistId with arrays, never a single
    // string. A consumer that trusts the string case is handling a
    // shape this code never produces.
    artist: string | string[];
    artistId?: string | string[];
    album?: string;
    albumId?: string;
    thumbnailUrl?: string;
    duration?: string;
}

export interface PlaylistViewModel {
    playlistId: string;
    name: string;
    description?: string;
    thumbnailUrl?: string;
}

export interface YTMusicCookies {
    cookie: string;
    expires?: number;
}

// This type names the Spotify API time ranges. YouTube Music has no
// such parameter and nothing in src/ imports it. It survives from the
// upstream extension I adapted this from, and I note it here instead
// of quietly deleting a type another fork might reference.
export type TimeRange = 'short_term' | 'medium_term' | 'long_term';
