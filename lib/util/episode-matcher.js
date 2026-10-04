function normalize(text = '') {
    return String(text).replace(/[._]/g, ' ')
}

function matchRanges(text, regex) {
    return [...normalize(text).matchAll(regex)].map(match => {
        const start = Number(match[1])
        const end = Number(match[2] ?? match[1])
        return [Math.min(start, end), Math.max(start, end)]
    })
}

function parsedRanges(values) {
    return values.filter(value => value !== undefined && value !== null && value !== '')
        .map(Number).filter(value => Number.isSafeInteger(value) && value >= 0)
        .map(value => [value, value])
}

function seasonRanges(text, info = {}) {
    const ranges = [
        ...matchRanges(text, /(?:^|[^\p{L}\p{N}])s(?:easons?)?\s*:?\s*(\d{1,2})(?:\s*[-–—]\s*s?(\d{1,2}))?(?!\d)/giu),
        ...matchRanges(text, /сезон(?:ы|а|ов)?\s*:?\s*(\d{1,2})(?:\s*[-–—]\s*(\d{1,2}))?(?!\d)/giu),
        ...matchRanges(text, /(?:^|[^\d])(\d{1,2})\s*(?:-?\s*(?:й|ый|ой))?\s*сезон/giu),
        ...matchRanges(text, /(?:^|[^\p{L}\p{N}])(\d{1,2})x\d{1,4}(?!\d)/giu)
    ]
    if (ranges.length) return ranges
    // PTT treats "Выпуски 01-03" as season 1, episode 3. An explicit
    // episode label cannot supply a season when the text has none.
    if (/(?:сери(?:я|и|й)|выпуск(?:и|ов)?|эпизод(?:ы|ов)?|episodes?)\s*:?\s*\d/iu.test(normalize(text))) return []
    return parsedRanges(info.seasons?.length ? info.seasons : [info.season])
}

function includes(ranges, number) {
    return ranges.some(([start, end]) => number >= start && number <= end)
}

function matchesSeason(torrent, season) {
    return includes(seasonRanges(torrent?.name, torrent?.info), Number(season))
}

function episodeEvidence(video, season, episode) {
    const name = normalize(video.name)
    // Paired tokens must stay paired: S01E02 + S02E03 cannot mean S01E03.
    const pairs = [
        ...name.matchAll(/(?:^|[^\p{L}\p{N}])s(\d{1,2})\s*e(\d{1,4})(?:\s*[-–—]\s*e?(\d{1,4}))?(?!\d)/giu),
        ...name.matchAll(/(?:^|[^\p{L}\p{N}])(\d{1,2})x(\d{1,4})(?:\s*[-–—]\s*(\d{1,4}))?(?!\d)/giu)
    ]
    if (pairs.length) {
        return {
            seasonKnown: true,
            matches: pairs.some(match => Number(match[1]) === season
                && episode >= Math.min(Number(match[2]), Number(match[3] ?? match[2]))
                && episode <= Math.max(Number(match[2]), Number(match[3] ?? match[2])))
        }
    }
    const ranges = [
        ...matchRanges(name, /(?:сери(?:я|и|й)|выпуск(?:и|ов)?|эпизод(?:ы|ов)?|episodes?|ep|e)\s*:?\s*(\d{1,4})(?:\s*[-–—]\s*(\d{1,4}))?(?!\d)/giu),
        ...matchRanges(name, /(?:^|[^\d])(\d{1,4})\s*(?:-?\s*(?:й|ый|ой|ий|ая|я))?\s*(?:выпуск|серия|эпизод)/giu)
    ]
    const parsed = parsedRanges(video.info?.episodes?.length ? video.info.episodes : [video.info?.episode])
    const bare = matchRanges(name.replace(/\s(?:mkv|mp4|avi|ts)$/i, ''), /^(\d{1,3})(?:\s|$)/g)
    return { matches: includes(ranges.length ? ranges : parsed.length ? parsed : bare, episode), seasonKnown: false }
}

function matchesEpisode(video, season, episode, torrent) {
    const targetSeason = Number(season)
    const targetEpisode = Number(episode)
    if (!Number.isSafeInteger(targetSeason) || targetSeason < 0
        || !Number.isSafeInteger(targetEpisode) || targetEpisode < 1) return false
    if (/(?:^|[^\p{L}\p{N}])(?:sample|trailer|образец|трейлер)(?=$|[^\p{L}\p{N}])/iu.test(video.name || '')) return false

    const evidence = episodeEvidence(video, targetSeason, targetEpisode)
    if (!evidence.matches) return false

    const folders = String(video.path || '').split(/[\\/]/).slice(0, -1)
    const scopes = [
        seasonRanges(video.name, video.info),
        ...folders.map(folder => seasonRanges(folder)),
        seasonRanges(torrent?.name, torrent?.info)
    ].filter(ranges => ranges.length)

    // All explicit season evidence must agree. A collection of seasons 1-9
    // alone cannot identify which season a file named "Выпуск 01" belongs to.
    return scopes.every(ranges => includes(ranges, targetSeason))
        && (evidence.seasonKnown || scopes.some(ranges => ranges.every(([start, end]) => start === targetSeason && end === targetSeason)))
}

function filterMatchingEpisode(torrentDetails, season, episode) {
    torrentDetails.videos = (torrentDetails.videos || [])
        .filter(video => matchesEpisode(video, season, episode, torrentDetails))
    return torrentDetails.videos.length > 0
}

function matchesDownloadEpisode(download, season, episode) {
    return !!download && matchesEpisode(download, season, episode)
}

export { matchesSeason, filterMatchingEpisode, matchesDownloadEpisode }
