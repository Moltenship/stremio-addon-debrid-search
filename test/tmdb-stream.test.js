import test from 'node:test'
import assert from 'node:assert/strict'
import addon from '../addon.js'
import Metadata from '../lib/util/metadata.js'

test.beforeEach(t => {
    const oldUrl = process.env.ADDON_URL
    process.env.ADDON_URL = 'https://addon.test'
    t.after(() => { if (oldUrl === undefined) delete process.env.ADDON_URL; else process.env.ADDON_URL = oldUrl })
})

test('TMDB episode reaches TorBox and selects the correct file from a multi-season pack', async t => {
    t.mock.method(Metadata, 'getMeta', async (type, id) => {
        assert.equal(type, 'series')
        assert.equal(id, 'tmdb:223749')
        return { id, name: 'Холостяк', titles: ['Холостяк', 'The Bachelor'] }
    })
    const requests = []
    t.mock.method(globalThis, 'fetch', async url => {
        requests.push(String(url))
        assert.ok(String(url).includes('/torrents/mylist'))
        return new Response(JSON.stringify({ success: true, data: [
            { id: 10, name: 'Холостяк. Сезоны 1-9', created_at: '2024-01-01', download_finished: true, download_present: true, files: [
                { id: 61, short_name: 'Выпуск 01.mkv', name: 'Холостяк/Сезон 6/Выпуск 01.mkv', size: 1000 },
                { id: 71, short_name: 'Выпуск 01.mkv', name: 'Холостяк/Сезон 7/Выпуск 01.mkv', size: 2000 },
                { id: 62, short_name: 'Выпуск 02.mkv', name: 'Холостяк/Сезон 6/Выпуск 02.mkv', size: 3000 }
            ] },
            { id: 11, name: 'Холостяк. Сезон 6', download_finished: false, download_present: true, files: [] }
        ] }), { headers: { 'Content-Type': 'application/json' } })
    })
    const result = await addon.get('stream', 'series', 'tmdb:223749:6:1', {}, { DebridProvider: 'TorBox', DebridApiKey: 'test-key' })
    assert.deepEqual(addon.manifest.idPrefixes, ['tt', 'tmdb:'])
    assert.equal(result.streams.length, 1)
    assert.equal(result.streams[0].url, 'https://addon.test/resolve/TorBox/test-key/10/61')
    assert.equal(result.streams[0].behaviorHints.bingeGroup, 'torbox|10')
    assert.equal(requests.length, 1, 'all aliases share one TorBox list request')
})

test('unsupported stream IDs return no streams without metadata or cloud requests', async t => {
    t.mock.method(Metadata, 'getMeta', () => assert.fail('unexpected metadata request'))
    t.mock.method(globalThis, 'fetch', () => assert.fail('unexpected cloud request'))
    const result = await addon.get('stream', 'series', 'other:123:1:1', {}, {})
    assert.deepEqual(result.streams, [])
})

test('IMDb episodes still use their media ID and exact season and episode', async t => {
    t.mock.method(Metadata, 'getMeta', async (type, id) => {
        assert.equal(type, 'series')
        assert.equal(id, 'tt1234567')
        return { name: 'Existing Show' }
    })
    t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ success: true, data: [
        { id: 20, name: 'Existing.Show.S02.1080p', download_finished: true, download_present: true, files: [
            { id: 3, short_name: 'Existing.Show.S02E03.mkv', name: 'Existing.Show.S02E03.mkv', size: 1000 },
            { id: 4, short_name: 'Existing.Show.S02E04.mkv', name: 'Existing.Show.S02E04.mkv', size: 2000 }
        ] }
    ] }), { headers: { 'Content-Type': 'application/json' } }))
    const result = await addon.get('stream', 'series', 'tt1234567:2:3', {}, { DebridProvider: 'TorBox', DebridApiKey: 'test-key' })
    assert.equal(result.streams.length, 1)
    assert.equal(result.streams[0].url, 'https://addon.test/resolve/TorBox/test-key/20/3')
})

test('TMDB movie titles retain year filtering and ignore empty torrents', async t => {
    t.mock.method(Metadata, 'getMeta', async (type, id) => {
        assert.equal(type, 'movie')
        assert.equal(id, 'tmdb:2020')
        return { id, name: 'The Bachelor', year: '1999' }
    })
    t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ success: true, data: [
        { id: 30, name: 'The.Bachelor.1999', download_finished: true, download_present: true, files: [
            { id: 0, name: 'The.Bachelor.1999.mkv', size: 1000 }
        ] },
        { id: 31, name: 'The.Bachelor.2017', download_finished: true, download_present: true, files: [
            { id: 0, name: 'The.Bachelor.2017.mkv', size: 2000 }
        ] },
        { id: 32, name: 'The.Bachelor.1999', download_finished: true, download_present: true, files: [] }
    ] }), { headers: { 'Content-Type': 'application/json' } }))
    const result = await addon.get('stream', 'movie', 'tmdb:2020', {}, { DebridProvider: 'TorBox', DebridApiKey: 'test-key' })
    assert.equal(result.streams.length, 1)
    assert.equal(result.streams[0].url, 'https://addon.test/resolve/TorBox/test-key/30/0')
    assert.ok(!result.streams[0].name.includes('undefined'))
})
