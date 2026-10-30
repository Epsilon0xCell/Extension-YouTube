// I handle sign-in here, and the only credential I have to work with is
// the cookie string the user pastes into the settings panel. SillyTavern
// stores it inside its own settings, so it sits on disk in plain text
// next to every other extension setting. I cannot change where
// SillyTavern puts its settings, but nobody should mistake the saved
// cookie for a vault: anyone who can read that settings file has the
// session.
import YTMusic from 'ytmusic-api';
import { getSettings, ExtensionSettings } from './settings';

const { t, saveSettingsDebounced } = SillyTavern.getContext();

// This looks like a shared client cache. It is not, yet. initYTMusicClient
// builds a fresh client on every call and stores it here, and nothing
// reads the stored value back before building the next one. So every
// tool call in tools.ts pays a full initialize round trip. I keep the
// variable because the return paths hand it out, but a reader should
// not assume calls are being reused.
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
        // A failed initialize deletes the saved cookies, whatever caused
        // it. That is the right answer for a cookie string YouTube
        // rejects, and a harsh one for a network hiccup at startup,
        // because the user has to paste the cookies again either way.
        // initialize() gives me no way to tell the two apart, so I do
        // not pretend to.
        console.error('Error initializing YouTube Music client:', error);
        settings.cookieData = null;
        setUserName(t`[Auth failed]`);
        saveSettingsDebounced();
        return null;
    }
}

export function setUserName(name: string): void {
    // The span only exists after addSettingsControls has run, which is
    // why index.ts builds the settings UI before it tries the saved
    // cookies. Run auth first and this quietly does nothing, and the
    // panel would keep whatever label the HTML shipped with.
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
            // The 30 days are my estimate, stamped at paste time.
            // Nothing from YouTube reports the real expiry back to me,
            // so the warning in checkCookieExpiration counts down to a
            // date I invented. A session can die weeks before it, or
            // outlive it.
            expires: Date.now() + (30 * 24 * 60 * 60 * 1000),
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

    // Once the stored date is inside this window the warning fires on
    // every call, and callers run this at startup and before most tool
    // calls, so the user sees the same toast again and again until they
    // paste fresh cookies. There is no "warned already" flag.
    const warningThreshold = 3 * 24 * 60 * 60 * 1000; // 3 days
    const currentTime = Date.now();

    if ((settings.cookieData.expires - currentTime) < warningThreshold) {
        toastr.warning(t`Your YouTube Music cookies will expire soon. Please update them.`, '', { timeOut: 10000 });
    }
}
