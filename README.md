## Debrid Search RU Stremio Addon

Stremio addon to search downloads and torrents in your Debrid cloud.

This fork adds multilingual title matching for Stremio stream results:

* looks up English and Russian titles/aliases from Wikidata by IMDb id
* searches the debrid cloud with all title variants, including punctuation-normalized forms
* keeps the original Cinemeta title as the fallback when alias lookup fails
* adds more tolerant Russian season/episode range matching for season packs

### TMDB titles without IMDb IDs

The addon also accepts TMDB movies (`tmdb:2020`) and episodes
(`tmdb:223749:6:1`). This supports shows such as the Russian *Холостяк*
that have a TMDB entry but no IMDb ID. Install a TMDB catalog addon to
open these cards in Stremio, then use Debrid Search RU to find files already
downloaded into your debrid account.

IMDb cards continue to use Cinemeta and Wikidata. TMDB cards use Russian and
English metadata from the public TMDB addon at `https://tmdb.elfhosted.com`;
no additional API key is required. Only public media IDs are sent there.
Self-hosters can set `TMDB_ADDON_URL` to another compatible TMDB addon base
URL supporting `/{language}/meta/{type}/{id}.json`. Metadata is cached for
10 minutes; a missing translation falls back to the other language. If both
requests fail, the request returns an error rather than unrelated streams.

For TorBox, the matcher uses the filename, folder path and torrent title.
It understands `S06E01`, `6x01`, `Выпуск 01`, `1-ый выпуск`, Russian episode
ranges and numbered files inside a known season. A file named `Выпуск 01`
inside a pack labelled `Сезоны 1-9` needs a season folder or an explicit
season in its filename. Ambiguous or conflicting seasons are not guessed.
Title matching remains approximate; identically named national versions may
still need distinguishable release names. This addon does not search trackers
or add new torrents to TorBox.

After upgrading, remove and reinstall the **Debrid Search RU** configuration
in Stremio so its installed manifest includes the new `tmdb:` prefix.
Keep your existing provider settings when reinstalling.

### Tests

Use Node.js 18.20.8 as pinned in `.node-version`:

```sh
pnpm install --frozen-lockfile
pnpm test
```

Tests cover TMDB-only metadata, IMDb compatibility, Russian season and episode
matching, and the complete stream-handler-to-TorBox path with mocked API
responses. They do not use account credentials or start downloads.

Original install: https://68d69db7dc40-debrid-search.baby-beamup.club/configure

## FAQs

Q1. Why DebridSearch is not showing any streaming links on the movie/series page?

> * DebridSearch only shows streaming links for the downloads and torrents present in your Debrid account. It does NOT search Debrid services for content not already present in your Debrid account.
> * The stream links on Stremio are based on Addon installation order. If DebridSearch is at end of the installed addons, any streams shown by DebridSearch would also be at the end of the streams list.

Q2. How to add content to Debrid account for DebridSearch to show them as streaming links?

> * You can find and manually add the torrent/link into your Debrid account and if it matches the movie/series IMDb name, DebridSearch would show it as a stream.
> * You can also use [Debrid Media Manager](https://debridmediamanager.com) on supported Debrid services.

Q3. Getting the error "The add-on providing this item has been removed" when trying to play content from the discover page?

> * Items in catalog/discover page of DebridSearch need Torrentio catalog option to be enabled to work. Stream links shown in movie/show details page don't need Torrentio.
