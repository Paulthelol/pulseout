## System Requirements

* **Node.js:** [Download Here](https://nodejs.org/en)
* **Operating System:** macOS, Windows (including WSL), or Linux.
* **IDE:** [Visual Studio Code](https://code.visualstudio.com/) (Recommended)
* **Database:** [Supabase Postgres Database](https://supabase.com/)
* **Auth:** [Spotify Developer Account](https://developer.spotify.com/dashboard)

> **Note for Windows Users:** Ensure the terminal being used in VSCode is **Command Prompt (cmd)** and not PowerShell.

---

## Installation Guide

### Phase 1: Local Setup
1.  Install Node.js if you haven't already.
2.  Open the code folder `pulseout` in VSCode.
3.  Install `pnpm` globally by running the following command in the terminal:
    ```bash
    npx pnpm add -g pnpm
    ```
4.  Install all necessary project components:
    ```bash
    pnpm install
    ```
5.  Rename the `.env.example` file to `.env`. You will fill this file out in the upcoming steps.

### Phase 2: Database Setup (Supabase)
6.  Visit [supabase.com](https://supabase.com/), sign up, and create a new Postgres database with default settings.
    * Copy the **Database Password** and paste it into your `.env` file under `POSTGRES_PASSWORD`.
7.  In Supabase, locate the **Connect** button at the top.
    * Copy the URL under **Transaction Pooler** and paste it into the `.env` variable `POSTGRES_URL`.
    * *Important:* Manually replace the `[YOUR-PASSWORD]` placeholder in that string with your actual password.
8.  Copy the section of the `POSTGRES_URL` that resembles `aws-0-east-1.pooler.supabase.com` and paste it into the `.env` variable `DATABASE_URL`.
9.  Copy the section of the `POSTGRES_URL` that resembles `postgres.abcdefghijklmnopqrstuv` (the user/project ID) and paste it into the `.env` variable `DATABASE_USER`.

### Phase 3: Environment Configuration
10. Run the following command to generate the Auth Secret:
    ```bash
    npx auth secret
    ```
11. Open the newly generated `.env.local` file.
    * Copy the `AUTH_SECRET` string (e.g., `AUTH_SECRET="Yg/E0..."`) and paste it into your main `.env` file.
    * **Delete** the `.env.local` file once this is done.

### Phase 4: Spotify Authentication Setup
12. Log in to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
    * *Note:* This is the account you will log into for testing.
13. Click the **Create App** button.
14. Enter an App Name (e.g., "PulseOut Test").
15. Enter a description (e.g., "Music Blog Website").
16. Enter the Website URL: `https://pulseout.vercel.app/`
17. **Configure Local DNS (Windows Only):**
    * Enter the Redirect URL in Spotify: `https://localhost.pulseout.dev:3000/api/auth/callback/spotify` and click **Add**.
    * Run **Notepad** as Administrator.
    * File > Open > Navigate to: `C:\Windows\System32\drivers\etc`.
    * Select "All Files" to see the files.
    * Open the `hosts` file.
    * At the very bottom of the document, paste this line:
        ```text
        127.0.0.1       localhost.pulseout.dev # Main dev site
        ```
    * Save and close Notepad.
18. Select **Web API** and **Web Playback SDK**.
19. Accept the Terms of Service and click **Save**.
20. Back on the Dashboard, select your newly created app.
21. Copy the **Client ID** and paste it into the `AUTH_SPOTIFY_ID` variable in your `.env` file.
22. Click **View Client Secret**, copy it, and paste it into the `AUTH_SPOTIFY_SECRET` variable in your `.env` file.

### Phase 5: Running the Application
23. Ensure all `.env` variables are now configured.
24. Push the schema to your database by running:
    ```bash
    pnpm drizzle-kit push
    ```
25. Start the local development server:
    ```bash
    pnpm dev
    ```
26. Visit the website in your browser:
    * Go to: [http://localhost:3000](http://localhost:3000) (or `https://localhost.pulseout.dev:3000` if using the custom host setup).
27. You can now log in and use the website!
