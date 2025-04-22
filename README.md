---
name: Postgres + Drizzle Next.js Starter
slug: postgres-drizzle
description: Simple Next.js template that uses a Postgres database and Drizzle as the ORM.
framework: Next.js
useCase: Starter
css: Tailwind
database: Postgres
demoUrl: https://postgres-drizzle.vercel.app/
relatedTemplates:
  - postgres-starter
  - postgres-prisma
  - postgres-kysely
---
Project Setup:
An alternative to running this code locally is visiting the Vercel Hosted Version at:
https://pulseout.vercel.app/

This project has the following system requirements:
Node.js Installation: https://nodejs.org/en
Operating systems: macOS, Windows (including WSL), or Linux.
Visual Studio Code is the recommended IDE for this project
A supabase postgres database: https://supabase.com/
A spotify account for development: https://developer.spotify.com/

Ensure the terminal being used in VSCode is command prompt and not powershell!

#1.) Install Node.js
#2.) Open the code folder "pulseout" in VSCode (Install VSCode if not installed)
#3.) Install pnpm using the following command in the terminal:
	npx pnpm add -g pnpm
#4.) Run the following command to install all necessary components:
	pnpm install
#5.) Change the name of the .env.example file to .env
FILL OUT THE .env FILE AS YOU PROGRESS THROUGH THE FOLLOWING STEPS
#6.) Visit supabase.com and create a new postgres database with default settings
	- Copy and paste the database password into the .env environment variable
	labelled POSTGRES_PASSWORD
#7.) At the top of the screen, locate the connection button
	- Copy the URL under Transaction Pooler and paste into the .env variable labelled POSTGRES_URL, 
	make sure to insert the password into the string
#8.) Copy the section of the POSTGRES_URL resembling this "aws-0-east-1.pooler.supabase.com"
	and paste into the .env variable DATABASE_URL
#9.) Copy the section of the POSTGRES_URL resembling this "postgres.abcdefghijklmnopqrstuv"
	and paste into the .env variable DATABASE_USER
#10.) Run the following command to generate the AUTH_SECRET .env variable:
	npx auth secret
#11.) Open the generated file .env.local and copy the environment string into the
	.env file, ex.) AUTH_SECRET="Yg/E0fB2eO1u1bgr0IbOm7CobKGtnZTe3HgVnGfY7sc="
	- Delete the .env.local file once this has been done
#12.) Then, visit developer.spotify.com and sign up for, or log into, an account
	- Once logged in, visit https://developer.spotify.com/dashboard
	- This is the account you will log into for testing
#13.) Click the Create App button
#14.) Enter an app name, such as "PulseOut Test"
#15.) Enter a description, such as "Music Blog Website"
#16.) Enter the url: https://pulseout.vercel.app/
#17.) Enter the redirect url: https://localhost.pulseout.dev:3000/api/auth/callback/spotify
	- Click add once entered into the textbox
	- Run Notepad as administrator
	- Selected open and visit this address in explorer: C:\Windows\System32\drivers\etc
	- Select view all files
	- Open "hosts" file
	- At the bottom of the document, paste this line: 	127.0.0.1       localhost.pulseout.dev # Main dev site
	- Save and close notepad
#18.) Select Web API and Web Playback SDK
#19.) Accept the terms of service and click save
#20.) If not already on the App page, select the newly created app from the dashboard page
#21.) Copy the Client ID and paste it into the AUTH_SPOTIY_ID .env file environment variable
#22.) Select view Client Secret and copy it, then paste it into the AUTH_SPOTIY_SECRET 
	.env file environment variable
#23.) At this point, all .env file environment variables should be configured
#24.) To configure the database, simply run the following command in the VSCode terminal:
	pnpm drizzle-kit push
#25.) This should complete the setup of the local website server configuration
#26.) To run the website, run the following command in the VSCode terminal:
	pnpm dev
#27.) Visit the website in your browser by ctrl-clicking on the link provided such as:
	http://localhost:3000
	or alternatively, you can type it into your web browser
#28.) You can now log in and use the website!
#29.) To view a new song, simply search the song title or artist, and click View Details,
	as in the current configuration, clicking on the song's title will redirect you to the Spotify page.
	(As of this deliverable, commenting is not currently implemented)