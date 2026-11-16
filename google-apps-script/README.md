# Astro Rumor Mill: Google Sheets setup

The site works immediately with four fictional demo entries while `RUMOR_API_URL` is the placeholder. Demo submissions live only in memory and disappear on page reload. Connect the shared tracker as follows.

1. Create a [Google Sheet](https://sheets.new) named **Astro Rumor Mill 2026-2027**. Put these exact headers in **A1:G1 of the first sheet tab**, in this order:

   ```text
   Institution | Category | Deadline | JobUrl | Status | Rumors | Updated
   ```

   Each header belongs in its own cell. Keep this tracker tab first; the API always uses the first tab. Set the spreadsheet's time zone under **File → Settings**; it determines log and update dates.
2. Open **Extensions → Apps Script**. Replace the starter code with [Code.gs](Code.gs) and save.
3. Select **setupRumorMill** in the function dropdown and click **Run** once. Authorize the requested spreadsheet access. This remembers the bound spreadsheet ID in Script Properties. This step is required because [active-document methods are unavailable when a bound script runs as a web app](https://developers.google.com/apps-script/guides/bound).
4. Choose **Deploy → New deployment → Web app**. Set **Execute as: Me** and **Who has access: Anyone** (including visitors without a Google account). Authorize the deployment, then copy the Web app URL ending in **`/exec`**, not `/dev`. See Google's [web app deployment instructions](https://developers.google.com/apps-script/guides/web).
5. In [assets/js/script.js](../assets/js/script.js), replace only the placeholder string assigned to `RUMOR_API_URL`:

   ```js
   const RUMOR_API_URL = "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec";
   ```

6. Open the `/exec` URL in a signed-out/private browser window. A new tracker should return `[]`, without a login prompt. Preview the site (for example, `python3 -m http.server 8000` in the repository), visit `http://localhost:8000/#rumor-mill`, and post a test job. Verify a second update appends a dated line to the same sheet row. Remove test rows directly in Sheets, then refresh the site.
7. Commit and push the site changes to GitHub. Share **https://yuchialin.com/#rumor-mill** once GitHub Pages finishes publishing.

If you change `Code.gs` later, use **Deploy → Manage deployments → Edit → Version: New version → Deploy** to keep the same URL. Re-run `setupRumorMill` if you move the script to another spreadsheet. If **Anyone** is unavailable, your Workspace administrator may restrict anonymous web apps; use an account that permits that access.

## API behavior

- `GET` returns an array of objects with `institution`, `category`, `deadline`, `jobUrl`, `status`, `rumors`, and `updated`. Dates use `YYYY-MM-DD`. Errors return `{ "success": false, "error": "..." }`.
- `POST` accepts those job details plus `rumor` (singular, one new message) and an empty `website` honeypot. Use JSON in a **`text/plain;charset=utf-8`** body, without authorization/custom headers or `application/json`; this avoids an OPTIONS preflight. Keep normal fetch redirects enabled because Google's [Content Service redirects its output](https://developers.google.com/apps-script/guides/content#redirects).
- A successful write returns `{ "success": true, "row": { ... } }`. Check `success`, since Apps Script error bodies can also have HTTP status 200. If a network response is lost, refresh before retrying: the write may already have succeeded.
- Institution (max 200 characters) + category match case-insensitively after trimming. An update preserves existing job details, fills an empty deadline/URL, updates status, and appends `[YYYY-MM-DD] ...` to the history. Rumors are required and limited to 500 characters; URLs to 2,048. Categories/statuses are validated, only HTTP(S) job URLs are accepted, and formula-like text is stored literally. A script lock serializes writes. A 45,000-character history limit rejects further updates without deleting previous entries.
- `GET` responses are cached in Apps Script's `CacheService` (gzip-compressed, up to 5 minutes) so most loads skip opening the spreadsheet. Every successful `POST` clears the cache, and so do manual edits in the sheet through the `onEdit` simple trigger. Changes that skip `onEdit` (such as **File → Import**) appear within 5 minutes. The site also keeps the last loaded list in each visitor's browser and shows it instantly while fresh data loads.

## Running the community tracker

The spreadsheet can stay private; the deployed API exposes all seven tracker columns and allows anonymous submissions. Do not store private data in them. No sign-in or contributor name is collected by this code; Google still handles requests under its own policies. The honeypot stops basic bots, not determined spam. Review reports in Sheets, remove abusive content there, and avoid posting applicant names or personal details. Use a dedicated tracker sheet; keep backups before manual moderation. Apps Script quotas can limit traffic, and anonymous reports remain unverified.
