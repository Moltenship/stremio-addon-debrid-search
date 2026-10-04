// TMDB's namespace is part of the media ID, not the season number.
function parseStreamId(type, id) {
    if (typeof id !== 'string' || !['movie', 'series'].includes(type)) return null
    const match = id.match(/^(tt\d+|tmdb:[1-9]\d*)(?::(\d+):(\d+))?$/)
    if (!match) return null
    const [, mediaId, season, episode] = match
    if (type === 'movie') return season === undefined ? { mediaId } : null
    if (season === undefined || !Number.isSafeInteger(Number(season))
        || !Number.isSafeInteger(Number(episode)) || Number(episode) < 1) return null
    return { mediaId, season: Number(season), episode: Number(episode) }
}

export { parseStreamId }
