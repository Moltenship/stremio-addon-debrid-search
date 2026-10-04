import fetch from 'node-fetch'
import Cinemeta from './cinemeta.js'

// Use a Stremio TMDB metadata endpoint so users do not need another API key.
// Only the public media ID is sent to this service, never debrid credentials.
function createMetadataResolver({
    fetchImpl = fetch,
    getCinemeta = Cinemeta.getMeta,
    tmdbAddonUrl = process.env.TMDB_ADDON_URL || 'https://tmdb.elfhosted.com',
    now = Date.now
} = {}) {
    const cache = new Map()
    const ttl = 10 * 60 * 1000

    async function loadTmdb(type, id) {
        const results = await Promise.allSettled(['ru-RU', 'en-US'].map(async language => {
            const url = `${tmdbAddonUrl.replace(/\/$/, '')}/${language}/meta/${type}/${encodeURIComponent(id)}.json`
            const response = await fetchImpl(url, { signal: AbortSignal.timeout(12000) })
            if (!response.ok) throw new Error('TMDB metadata request failed')
            const { meta } = await response.json()
            if (!meta || typeof meta.name !== 'string' || !meta.name.trim()) {
                throw new Error('TMDB metadata was empty')
            }
            return meta
        }))
        const metas = results.filter(result => result.status === 'fulfilled').map(result => result.value)
        if (!metas.length) throw new Error(`TMDB metadata unavailable for ${type}/${id}`)
        const primary = metas[0]
        const imdbId = metas.flatMap(meta => [meta.imdb_id, meta.imdbId, meta.id])
            .find(value => typeof value === 'string' && /^tt\d+$/.test(value))
        return {
            ...primary,
            id,
            imdb_id: imdbId,
            year: primary.year || primary.releaseInfo?.match(/^\d{4}/)?.[0],
            titles: metas.flatMap(meta => [meta.name, meta.originalName, meta.original_name])
                .filter(value => typeof value === 'string' && value.trim())
        }
    }

    async function getMeta(type, id) {
        if (!['movie', 'series'].includes(type)) throw new Error('Unsupported media type')
        if (/^tt\d+$/.test(id)) return getCinemeta(type, id)
        if (!/^tmdb:[1-9]\d*$/.test(id)) throw new Error('Unsupported media ID')
        const key = `${type}:${id}`
        const cached = cache.get(key)
        if (cached && cached.expires > now()) return cached.promise
        if (cache.size >= 500) cache.delete(cache.keys().next().value)
        const entry = { expires: now() + ttl }
        entry.promise = loadTmdb(type, id).catch(error => {
            if (cache.get(key) === entry) cache.delete(key)
            throw error
        })
        cache.set(key, entry)
        return entry.promise
    }

    return { getMeta }
}

export { createMetadataResolver }
export default createMetadataResolver()
