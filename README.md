# Classic Tabs

Classic Tabs brings back some of the extra tab options from Opera 12.

See [the ClassicTabs extension page at opera.com](https://addons.opera.com/en/extensions/details/classic-tabs/) to install the latest stable version.

Please use the [issues tab](https://github.com/ChaosinaCan/ClassicTabs/issues) above if you find a problem. I do get notified when an issue is filed on Opera's addons page, but GitHub's issues are easier for me to use.

# Development

This extension uses [webextension-toolbox](https://github.com/HaNdTriX/webextension-toolbox) to build.

First, install all dependencies by running this command in a terminal window:

	$ npm install

## Development Build

To build the extension in development mode with hot-reloading, run the appropriate command for your browser in a terminal window (Command Prompt on Windows):

    npm run dev chrome
    npm run dev firefox
    npm run dev opera
    npm run dev edge

If you are using Visual Studio Code, you can also press Ctrl+P and type `task watch`, then select your browser.

Then load `dist/<browser>/` in your browser as an unpacked extension:

### Chrome

1. Open **Menu > More Tools > Extensions**.
2. Enable the **Developer mode** toggle.
3. Click **Load unpacked** and select the `dist/chrome` folder inside this project.

### Firefox

1. Open the Add-ons Manager (Ctrl+Shift+A) and select the **Extensions** tab.
2. Click the gear icon and select **Debug Add-ons**.
3. Click **Load Temporary Add-on...** and select the `dist/firefox/manifest.json` fi inside this project.

### Opera

1. Open the extensions page (Ctrl+Shift+E).
2. Click the **Developer Mode** button.
3. Click **Load unpacked extension...** and select the `dist/opera` folder inside this project.

### Edge

1. [Follow Microsoft's instructions for enabling developer features](https://docs.microsoft.com/en-us/microsoft-edge/extensions/guides/adding-and-removing-extensions).
2. Restart Edge.
3. Open **Menu > Extensions**.
4. Click **Load extension** and select

## Production Build

To build an extension package, run the appropriate command for your browser in a terminal window:

    npm run build chrome
    npm run build firefox
    npm run build opera
    npm run build edge

If you are using Visual Studio Code, you can also press Ctrl+P and type `task build`, then select your browser.

The extension package will be written to `packages/`.

## Localization

If you'd like to translate this extension into a new language, please do the following:

1. Fork this repo.
2. In your forked repo, make a new folder under `_locales/` and name it to match the [locale code for your language](https://developer.chrome.com/webstore/i18n?csw=1#localeTable).
3. Copy `_locales/en/messages.json` to your new locale folder.
4. Translate each of the strings after `"message":` in your locale's `messages.json`.
5. Follow the instructions above to make a development build and load it into your browser.
6. Test that everything is translated properly.
7. Commit your changes and push them to GitHub.
8. Send a pull request with your changes.

Note that if you make changes to `messages.json`, the development build must still be running or the changes won't be copied over to the extension loaded into your browser. You may also need to reload the extension for the changes to take effect.

See https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Internationalization for more documentation on localizing extensions.

You may need to adjust some settings in your browser if the locale you want to test doesn't match your OS's locale:

### Chrome

[See instructions](https://developer.chrome.com/extensions/i18n#locales-testing).

### Firefox

[See instructions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Internationalization#Testing_out_your_extension).

### Opera

Open settings and change your default language.

### Edge

Edge does not appear to have a separate language option. Change the locale for Windows.
