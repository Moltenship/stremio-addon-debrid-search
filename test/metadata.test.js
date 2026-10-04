import test from 'node:test'
import assert from 'node:assert/strict'
import { createMetadataResolver } from '../lib/util/metadata.js'
import { getSearchKeys } from '../lib/util/search-keys.js'

const response = meta => ({ ok: true, json: async () => ({ meta }) })

test('TMDB-only shows supply Russian, English and original names without IMDb', async () => {
    const requests = []
    const resolver = createMetadataResolver({
        tmdbAddonUrl: 'https://metadata.test/',
        fetchImpl: async (url, options) => {
            requests.push(url)
            assert.ok(options.signal)
            assert.equal(options.headers, undefined)
            return response({ id: 'tmdb:223749', name: url.includes('ru-RU') ? 'Холостяк' : 'The Bachelor', original_name: 'Холостяк', releaseInfo: '2013-' })
        },
        getCinemeta: () => assert.fail('TMDB must not require Cinemeta')
    })
    const [meta, duplicate] = await Promise.all([resolver.getMeta('series', 'tmdb:223749'), resolver.getMeta('series', 'tmdb:223749')])
    assert.deepEqual(meta, duplicate)
    assert.equal(meta.imdb_id, undefined)
    assert.equal(meta.year, '2013')
    assert.deepEqual(await getSearchKeys(meta), ['Холостяк', 'The Bachelor'])
    assert.equal(requests.length, 2)
    assert.ok(requests.every(url => url.includes('/meta/series/tmdb%3A223749.json')))
    await resolver.getMeta('series', 'tmdb:223749')
    assert.equal(requests.length, 2)
    await resolver.getMeta('movie', 'tmdb:223749')
    assert.equal(requests.length, 4)
})

test('IMDb requests keep the existing Cinemeta path', async () => {
    const resolver = createMetadataResolver({
        fetchImpl: () => assert.fail('IMDb should not call TMDB'),
        getCinemeta: async (type, id) => ({ type, id, name: 'Existing title' })
    })
    assert.equal((await resolver.getMeta('movie', 'tt123')).name, 'Existing title')
})

test('one unavailable language does not hide a show', async () => {
    const resolver = createMetadataResolver({ fetchImpl: async url => {
        if (url.includes('ru-RU')) throw new Error('offline')
        return response({ name: 'The Bachelor', imdb_id: null })
    } })
    assert.equal((await resolver.getMeta('series', 'tmdb:223749')).name, 'The Bachelor')
})

test('metadata failures are retryable and successful entries expire', async () => {
    let calls = 0
    let clock = 0
    const resolver = createMetadataResolver({ now: () => clock, fetchImpl: async () => {
        calls++
        return calls <= 2 ? { ok: false } : response({ name: 'Холостяк' })
    } })
    await assert.rejects(resolver.getMeta('series', 'tmdb:223749'), /unavailable/)
    await resolver.getMeta('series', 'tmdb:223749')
    assert.equal(calls, 4)
    clock = 11 * 60 * 1000
    await resolver.getMeta('series', 'tmdb:223749')
    assert.equal(calls, 6)
})

test('empty metadata cannot trigger a broad cloud search', async () => {
    const resolver = createMetadataResolver({ fetchImpl: async () => response({}) })
    await assert.rejects(resolver.getMeta('series', 'tmdb:223749'), /unavailable/)
})
