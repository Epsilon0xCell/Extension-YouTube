import YTMusic from 'ytmusic-api';
import { getSettings, ExtensionSettings } from './settings';

const { t, saveSettingsDebounced } = SillyTavern.getContext();

let ytMusicClient: YTMusic | null = null;

export async function initYTMusicClient(settings: ExtensionSettings): Promise<YTMusic | null> {
    if (!settings.cookieData) {
        setUserName(t`[Not logged in]`);
        return null;
    }

    try {
        // ytmusic-api 4.x takes no constructor options. Cookies are passed
        // to initialize(), which parses them and loads the site config.
        // The previous code passed { cookie: ... } to the constructor,
        // which the library ignores, so no session was ever set up.
        const client = new YTMusic();
        const initialized = await client.initialize(settings.cookieData.cookie);
        if (!initialized) {
            throw new Error('Cookie string could not be parsed');
        }
        ytMusicClient = client;
        return ytMusicClient;
    } catch (error) {
        console.error('Error initializing YouTube Music client:', error);
        settings.cookieData = null;
        setUserName(t`[Auth failed]`);
        saveSettingsDebounced();
        return null;
    }
}

export function setUserName(name: string): void {
    const userName = document.getElementById('ytmusic_user_name') as HTMLSpanElement;
    if (userName) {
        userName.innerText = name;
    }
}

export async function importYTMusicCookies(cookieString: string): Promise<void> {
    if (!cookieString) {
        toastr.error(t`Please provide valid YouTube Music cookies.`);
        return;
    }

    const settings = getSettings();

    try {
        // Actually initialize a client with the cookies before saving
        // them. The previous code only constructed a client object and
        // then reported success without any check, so invalid cookies
        // were stored and announced as a successful login.
        const testClient = new YTMusic();
        const initialized = await testClient.initialize(cookieString);
        if (!initialized) {
            throw new Error('Cookie string could not be parsed');
        }
        settings.cookieData = {
            cookie: cookieString,
            expires: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days expiration
        };
        saveSettingsDebounced();
        ytMusicClient = testClient;
        setUserName(t`[Authenticated]`);
        toastr.success(t`Successfully authenticated with YouTube Music!`);
    } catch (error) {
        console.error('Error during YouTube Music authentication:', error);
        toastr.error(t`YouTube Music authentication failed. Please check your cookies and try again.`);
    }
}

export async function tryGetClientFromCookies(settings: ExtensionSettings): Promise<void> {
    if (!settings.cookieData) {
        setUserName(t`[Not logged in]`);
        return;
    }

    try {
        const client = await initYTMusicClient(settings);
        if (client) {
            // ytmusic-api 4.x exposes no account info endpoint, so a
            // successful initialize() is the strongest check available.
            setUserName(t`[Authenticated]`);
        }
    } catch (error) {
        console.error('Error fetching account data:', error);
        settings.cookieData = null;
        setUserName(t`[Auth failed]`);
        saveSettingsDebounced();
    }
}

export function checkCookieExpiration(settings: ExtensionSettings): void {
    if (!settings.cookieData || !settings.cookieData.expires) {
        return;
    }

    // If cookies are about to expire (within 3 days), show a warning
    const warningThreshold = 3 * 24 * 60 * 60 * 1000; // 3 days
    const currentTime = Date.now();

    if ((settings.cookieData.expires - currentTime) < warningThreshold) {
        toastr.warning(t`Your YouTube Music cookies will expire soon. Please update them.`, '', { timeOut: 10000 });
    }
}
