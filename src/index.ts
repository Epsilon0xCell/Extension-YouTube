import { tryGetClientFromCookies, checkCookieExpiration } from './auth';
import { getSettings, addSettingsControls } from './settings';
import { syncFunctionTools } from './tools';
import { setCurrentTrack } from './prompt';
import './style.css';

(async function main() {
    const context = SillyTavern.getContext();
    const settings = getSettings();
    // Order in this function is load-bearing. The settings controls have
    // to exist in the page before the cookie attempt runs, because the
    // auth code writes the result into a span that only the controls
    // create. And the tools sync after auth, so registration sees the
    // settings state the cookie attempt left behind.
    addSettingsControls(settings);

    await tryGetClientFromCookies(settings);
    checkCookieExpiration(settings);

    // SillyTavern calls prompt interceptors by global name, not through
    // the module system. This assignment is the registration; removing
    // it leaves a working-looking extension that never gets asked about
    // the current track.
    globalThis.ytmusic_setCurrentTrack = setCurrentTrack;
    syncFunctionTools();
    context.saveSettingsDebounced();
})();
