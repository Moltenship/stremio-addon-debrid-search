import Cinemeta from './util/cinemeta.js'
import DebridLink from './debrid-link.js'
import RealDebrid from './real-debrid.js'
import AllDebrid from './all-debrid.js'
import Premiumize from './premiumize.js'
import TorBox from './torbox.js'
import { BadRequestError } from './util/error-codes.js'
import { FILE_TYPES } from './util/file-types.js'
import { getSearchKeys } from './util/search-keys.js'
import { matchesSeason, filterMatchingEpisode, matchesDownloadEpisode } from './util/episode-matcher.js'

const STREAM_NAME_MAP = {
    debridlink: "[DL+] DebridSearch",
    realdebrid: "[RD+] DebridSearch",
    alldebrid: "[AD+] DebridSearch",
    premiumize: "[PM+] DebridSearch",
    torbox: "[TB+] DebridSearch"
}

async function getMovieStreams(config, type, id) {
    const cinemetaDetails = await Cinemeta.getMeta(type, id)
    const searchKeys = await getSearchKeys(cinemetaDetails)

    let apiKey = config.DebridLinkApiKey ? config.DebridLinkApiKey : config.DebridApiKey

    if (config.DebridLinkApiKey || config.DebridProvider == "DebridLink") {
        const torrents = await searchTorrentsWithKeys(DebridLink.searchTorrents, apiKey, searchKeys)
        if (torrents && torrents.length) {
            const torrentIds = torrents
                .filter(torrent => filterYear(torrent, cinemetaDetails))
                .map(torrent => torrent.id)

            if (torrentIds && torrentIds.length) {
                return await DebridLink.getTorrentDetails(apiKey, torrentIds.join())
                    .then(torrentDetailsList => {
                        return torrentDetailsList.map(torrentDetails => toStream(torrentDetails))
                    })
            }
        }
    } else if (config.DebridProvider == "RealDebrid") {
        let results = []
        const torrents = await searchTorrentsWithKeys(RealDebrid.searchTorrents, apiKey, searchKeys)
        if (torrents && torrents.length) {
            const streams = await Promise.all(torrents
                .filter(torrent => filterYear(torrent, cinemetaDetails))
                .map(torrent => {
                return RealDebrid.getTorrentDetails(apiKey, torrent.id)
                    .then(torrentDetails => toStream(torrentDetails))
                    .catch(err => {
                        console.log(err)
                        Promise.resolve()
                    })
            }))
            results.push(...streams)
        }

        const downloads = await searchTorrentsWithKeys(RealDebrid.searchDownloads, apiKey, searchKeys)
        if (downloads && downloads.length) {
            const streams = await Promise.all(downloads
                .filter(download => filterYear(download, cinemetaDetails))
                .map(download => {return toStream(download, type)}))
            results.push(...streams)
        }
        return results.filter(stream => stream)
    } else if (config.DebridProvider == "AllDebrid") {
        const torrents = await searchTorrentsWithKeys(AllDebrid.searchTorrents, apiKey, searchKeys)
        if (torrents && torrents.length) {
            const streams = await Promise.all(
                torrents
                    .filter(torrent => filterYear(torrent, cinemetaDetails))
                    .map(torrent => {
                        return AllDebrid.getTorrentDetails(apiKey, torrent.id)
                            .then(torrentDetails => toStream(torrentDetails))
                            .catch(err => {
                                console.log(err)
                                Promise.resolve()
                            })
                    })
            )

            return streams.filter(stream => stream)
        }
    } else if (config.DebridProvider == "Premiumize") {
        const files = await searchTorrentsWithKeys(Premiumize.searchFiles, apiKey, searchKeys)
        if (files && files.length) {
            const streams = await Promise.all(
                files
                    .filter(file => filterYear(file, cinemetaDetails))
                    .map(torrent => {
                        return Premiumize.getTorrentDetails(apiKey, torrent.id)
                            .then(torrentDetails => toStream(torrentDetails))
                            .catch(err => {
                                console.log(err)
                                Promise.resolve()
                            })
                    })
            )

            return streams.filter(stream => stream)
        }
    } else if (config.DebridProvider == "TorBox") {
        const torrents = await searchTorrentsWithKeys(TorBox.searchTorrents, apiKey, searchKeys)
        if (torrents && torrents.length) {
            const streams = await Promise.all(
                torrents
                    .filter(torrent => filterYear(torrent, cinemetaDetails))
                    .map(torrentDetails => toStream(torrentDetails))
            )

            return streams.filter(stream => stream)
        }
    } else {
        return Promise.reject(BadRequestError)
    }

    return []
}

async function getSeriesStreams(config, type, id) {
    const [imdbId, season, episode] = id.split(":")
    const cinemetaDetails = await Cinemeta.getMeta(type, imdbId)
    const searchKeys = await getSearchKeys(cinemetaDetails)

    let apiKey = config.DebridLinkApiKey ? config.DebridLinkApiKey : config.DebridApiKey

    if (config.DebridLinkApiKey || config.DebridProvider == "DebridLink") {
        const torrents = await searchTorrentsWithKeys(DebridLink.searchTorrents, apiKey, searchKeys)
        if (torrents && torrents.length) {
            const torrentIds = torrents
                .filter(torrent => matchesSeason(torrent, season))
                .map(torrent => torrent.id)

            if (torrentIds && torrentIds.length) {
                return DebridLink.getTorrentDetails(apiKey, torrentIds.join())
                    .then(torrentDetailsList => {
                        return torrentDetailsList
                            .filter(torrentDetails => filterMatchingEpisode(torrentDetails, season, episode))
                            .map(torrentDetails => toStream(torrentDetails, type))
                    })
            }
        }
    } else if (config.DebridProvider == "RealDebrid") {
        let results = []
        const torrents = await searchTorrentsWithKeys(RealDebrid.searchTorrents, apiKey, searchKeys)
        if (torrents && torrents.length) {
            const streams = await Promise.all(torrents
                .filter(torrent => matchesSeason(torrent, season))
                .map(torrent => {
                    return RealDebrid.getTorrentDetails(apiKey, torrent.id)
                        .then(torrentDetails => {
                            if (filterMatchingEpisode(torrentDetails, season, episode)) {
                                return toStream(torrentDetails, type)
                            }
                        })
                        .catch(err => {
                            console.log(err)
                            Promise.resolve()
                        })
                }))
            results.push(...streams)
        }

        const downloads = await searchTorrentsWithKeys(RealDebrid.searchDownloads, apiKey, searchKeys)
        if (downloads && downloads.length) {
            const streams = await Promise.all(downloads
                .filter(download => matchesDownloadEpisode(download, season, episode))
                .map(download => {return toStream(download, type)}))
            results.push(...streams)
        }
        return results.filter(stream => stream)
    } else if (config.DebridProvider == "AllDebrid") {
        const torrents = await searchTorrentsWithKeys(AllDebrid.searchTorrents, apiKey, searchKeys)
        if (torrents && torrents.length) {
            const streams = await Promise.all(torrents
                .filter(torrent => matchesSeason(torrent, season))
                .map(torrent => {
                    return AllDebrid.getTorrentDetails(apiKey, torrent.id)
                        .then(torrentDetails => {
                            if (filterMatchingEpisode(torrentDetails, season, episode)) {
                                return toStream(torrentDetails, type)
                            }
                        })
                        .catch(err => {
                            console.log(err)
                            Promise.resolve()
                        })
                })
            )

            return streams.filter(stream => stream)
        }
    } else if (config.DebridProvider == "Premiumize") {
        const torrents = await searchTorrentsWithKeys(Premiumize.searchFiles, apiKey, searchKeys)
        if (torrents && torrents.length) {
            const streams = await Promise.all(torrents
                .filter(torrent => matchesSeason(torrent, season))
                .map(torrent => {
                    return Premiumize.getTorrentDetails(apiKey, torrent.id)
                        .then(torrentDetails => {
                            if (filterMatchingEpisode(torrentDetails, season, episode)) {
                                return toStream(torrentDetails, type)
                            }
                        })
                        .catch(err => {
                            console.log(err)
                            Promise.resolve()
                        })
                })
            )

            return streams.filter(stream => stream)
        }
    } else if (config.DebridProvider == "TorBox") {
        const torrents = await searchTorrentsWithKeys(TorBox.searchTorrents, apiKey, searchKeys)
        if (torrents && torrents.length) {
            const streams = await Promise.all(
                torrents
                    .filter(torrent => filterMatchingEpisode(torrent, season, episode))
                    .map(torrentDetails => toStream(torrentDetails, type))
            )
            return streams.filter(stream => stream)
        }
    } else {
        return Promise.reject(BadRequestError)
    }

    return []
}

async function resolveUrl(debridProvider, debridApiKey, itemId, hostUrl, clientIp) {
    if (debridProvider == "DebridLink" || debridProvider == "Premiumize") {
        return hostUrl
    } else if (debridProvider == "RealDebrid") {
        return RealDebrid.unrestrictUrl(debridApiKey, hostUrl, clientIp)
    } else if (debridProvider == "AllDebrid") {
        return AllDebrid.unrestrictUrl(debridApiKey, hostUrl)
    } else if (debridProvider == "TorBox") {
        return TorBox.unrestrictUrl(debridApiKey, itemId, hostUrl, clientIp)
    } else {
        return Promise.reject(BadRequestError)
    }
}

function filterYear(torrent, cinemetaDetails) {
    if (torrent?.info?.year && cinemetaDetails?.year) {
        return torrent.info.year == cinemetaDetails.year
    }

    return true
}

function toStream(details, type) {
    let video, icon
    if (details.fileType == FILE_TYPES.DOWNLOADS) {
        icon = '⬇️'
        video = details
    } else {
        icon = '💾'
        video = details.videos.sort((a, b) => b.size - a.size) && details.videos[0]
    }
    let title = details.name
    if (type == 'series') {
        title = title + '\n' + video.name
    }
    title = title + '\n' + icon + ' ' + formatSize(video.size)

    let name = STREAM_NAME_MAP[details.source]
    name = name + '\n' + (video.info.resolution || details.info.resolution)

    let bingeGroup = details.source + '|' + details.id

    return {
        name,
        title,
        url: video.url,
        behaviorHints: {
            bingeGroup: bingeGroup
        }
    }
}

function formatSize(size) {
    if (!size) {
        return undefined
    }

    const i = size === 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024))
    return Number((size / Math.pow(1024, i)).toFixed(2)) + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i]
}

async function searchTorrentsWithKeys(searchFn, apiKey, searchKeys, threshold = 0.1) {
    const results = []

    for (const searchKey of searchKeys) {
        const torrents = await searchFn(apiKey, searchKey, threshold)
        results.push(...(torrents || []))
    }

    return dedupeById(results)
}

function dedupeById(items) {
    const seen = new Set()

    return items.filter(item => {
        const key = `${item.source || ''}:${item.id || item.url || item.name}`
        if (seen.has(key)) {
            return false
        }

        seen.add(key)
        return true
    })
}

export default { getMovieStreams, getSeriesStreams, resolveUrl }
