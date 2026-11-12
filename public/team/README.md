# Team photos

Team photos must be square, at least 600 × 600 pixels, and provided as JPG,
PNG, or WebP files smaller than 300 KB. Use a lowercase file name matching the
member ID, for example `ayesha.jpg`.

Place each approved image in this folder and set that member's `photo` value in
`src/lib/team.ts` to its local path, such as `"/team/ayesha.jpg"`. Until a photo
is provided, keep the value `null`; the page will display initials instead.

Add a member's GitHub and LinkedIn profile URLs to their `github` and `linkedin`
values in `src/lib/team.ts`. Use HTTPS URLs hosted on `github.com` or
`linkedin.com` (including their `www` subdomains). Keep any unavailable links
as `null`.
