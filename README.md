# OTT Team Pulse Dashboard

Free GitHub Pages deployment for the Team Pulse dashboard.

## Important privacy model

The GitHub repository must be public to use GitHub Pages on GitHub Free. **Do not upload Team Pulse JSON backups or any file containing the team's 1:1 notes to this repository.**

The dashboard stores Andrea's editable data in her browser's local storage. When she clicks **Publish viewer link**, a compressed read-only snapshot is placed in the URL hash. The hash is not sent to the web server, so the data is not stored in the repository.

Ash only receives the viewer link and does not need a GitHub account.

## Admin workflow

1. Open the site without `#view=`.
2. Import the private Team Pulse JSON backup once.
3. Make edits; they save in that browser.
4. Use **Backup** regularly to download a private JSON backup.
5. Use **Publish viewer link** whenever you want to send Ash an updated snapshot.

The viewer link is a snapshot. If Andrea changes the dashboard later, she publishes a new viewer link.
