function matchesSeason(torrent, season) {
    return torrent?.info.season == season
        || torrent?.info.seasons?.includes(Number(season))
        || seasonInText(torrent?.name, season)
}

function filterMatchingEpisode(torrentDetails, season, episode) {
    torrentDetails.videos = torrentDetails.videos
        .filter(video => matchesEpisode(video, season, episode))

    return torrentDetails.videos && torrentDetails.videos.length
}

function matchesEpisode(video, season, episode) {
    return (season == video.info.season && episode == video.info.episode)
        || episodeInText(video?.name, season, episode)
}

function matchesDownloadEpisode(download, season, episode) {
    return download && (
        (download.info.season == season && download.info.episode == episode)
        || episodeInText(download?.name, season, episode)
    )
}

function seasonInText(text, season) {
    const ranges = [
        ...matchRanges(text, /s(?:eason)?\s*(\d{1,2})(?:\s*[-–—]\s*(\d{1,2}))?/gi),
        ...matchRanges(text, /сезон(?:ы|а|ов)?\s*(\d{1,2})(?:\s*[-–—]\s*(\d{1,2}))?/gi)
    ]

    return ranges.some(range => numberInRange(Number(season), range))
}

function episodeInText(text, season, episode) {
    const targetSeason = Number(season)
    const targetEpisode = Number(episode)

    if (!text || !targetEpisode) {
        return false
    }

    const sxeMatches = [...text.matchAll(/s(\d{1,2})\s*e(\d{1,4})(?:\s*[-–—]\s*e?(\d{1,4}))?/gi)]
    if (sxeMatches.some(match => Number(match[1]) === targetSeason && numberInRange(targetEpisode, toRange(match[2], match[3])))) {
        return true
    }

    const russianSeasonRanges = matchRanges(text, /сезон(?:ы|а|ов)?\s*(\d{1,2})(?:\s*[-–—]\s*(\d{1,2}))?/gi)
    const russianEpisodeRanges = matchRanges(text, /сери(?:я|и|й)\s*(\d{1,4})(?:\s*[-–—]\s*(\d{1,4}))?/gi)

    if (russianEpisodeRanges.length) {
        const seasonMatches = !russianSeasonRanges.length || russianSeasonRanges.some(range => numberInRange(targetSeason, range))
        const episodeMatches = russianEpisodeRanges.some(range => numberInRange(targetEpisode, range))
        return seasonMatches && episodeMatches
    }

    return false
}

function matchRanges(text, regex) {
    if (!text) {
        return []
    }

    return [...text.matchAll(regex)].map(match => toRange(match[1], match[2]))
}

function toRange(start, end = start) {
    const rangeStart = Number(start)
    const rangeEnd = Number(end || start)
    return [Math.min(rangeStart, rangeEnd), Math.max(rangeStart, rangeEnd)]
}

function numberInRange(value, [start, end]) {
    return value >= start && value <= end
}

export { matchesSeason, filterMatchingEpisode, matchesDownloadEpisode }
