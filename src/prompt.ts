import { INJECT_ID, InjectionPosition } from './constants';
import { getSettings } from './settings';
import { checkCookieExpiration } from './auth';

const { setExtensionPrompt } = SillyTavern.getContext();

export function resetInject() {
    // Reset the prompt to avoid showing old data
    setExtensionPrompt(INJECT_ID, '', InjectionPosition.None, 0);
}

export async function setCurrentTrack(): Promise<void> {
    resetInject();
    const settings = getSettings();
    if (!settings.cookieData || !settings.template || settings.position === InjectionPosition.None) {
        return;
    }

    checkCookieExpiration(settings);

    // ytmusic-api 4.x, the version this extension depends on, has no
    // now-playing endpoint and no listening-history endpoint. The
    // previous implementation called a getHistory() method that does
    // not exist in the library, so this interceptor could never inject
    // anything (and the project did not compile). Until the library
    // offers history access, the interceptor clears any stale injection
    // and leaves the prompt unchanged instead of failing.
    console.log('YouTube Music: current-track injection is unavailable because ytmusic-api 4.x provides no history or now-playing endpoint.');
}
