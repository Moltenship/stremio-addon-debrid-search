## Debrid Search RU Stremio Addon

Stremio addon to search downloads and torrents in your Debrid cloud.

This fork adds multilingual title matching for Stremio stream results:

* looks up English and Russian titles/aliases from Wikidata by IMDb id
* searches the debrid cloud with all title variants, including punctuation-normalized forms
* keeps the original Cinemeta title as the fallback when alias lookup fails
* adds more tolerant Russian season/episode range matching for season packs

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
