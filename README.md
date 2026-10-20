# Percy (Android app)

Percy as an installable Android app. Items live on the phone. Attached files are saved to
Documents › Percy › <trip name> so you can see them in your Files app.

## Build the APK (no Android Studio needed)
1. Create a new private repository on GitHub called `percy`.
2. In this folder run:
   git init -b main && git add -A && git commit -m "Percy" 
   git remote add origin https://github.com/<you>/percy.git && git push -u origin main
3. On GitHub open the Actions tab, pick "Build Percy APK", and wait 5 to 10 minutes for a green tick.
   (If it does not start by itself, press "Run workflow".)
4. Open the finished run, download the `percy-apk` artifact, and unzip it to get `app-debug.apk`.

## Install on your phone
1. Send `app-debug.apk` to your phone (Google Drive, email, or USB).
2. Tap it. Allow "Install unknown apps" for the app you opened it from when asked.
3. If Play Protect warns about an unrecognised app, choose "Install anyway". It is your own app.

## First run
1. More › Backup & data › paste your Anthropic API key (console.anthropic.com). This is only used to read booking confirmations.
2. Open a trip › Import a confirmation.

## Updating
Change the files, push to GitHub, download the new APK and install it over the old one.
Your data stays because every build is signed with the same key (`debug.keystore`).
Always export a backup (More › Backup & data) before uninstalling.

## Regenerate www/index.html from the artifact
python3 tools/build.py path/to/life-admin.html
