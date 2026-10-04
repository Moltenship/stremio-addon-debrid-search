import test from 'node:test'
import assert from 'node:assert/strict'
import { parseStreamId } from '../lib/util/media-id.js'

test('IMDb and TMDB episode namespaces preserve the media ID', () => {
    assert.deepEqual(parseStreamId('series', 'tmdb:223749:6:1'), { mediaId: 'tmdb:223749', season: 6, episode: 1 })
    assert.deepEqual(parseStreamId('series', 'tt1234567:0:1'), { mediaId: 'tt1234567', season: 0, episode: 1 })
    assert.deepEqual(parseStreamId('movie', 'tmdb:2020'), { mediaId: 'tmdb:2020' })
    assert.deepEqual(parseStreamId('movie', 'tt0120596'), { mediaId: 'tt0120596' })
})

test('malformed, unsupported and episode-less stream requests are rejected', () => {
    for (const id of ['tmdb:223749', 'tmdb:223749:6', 'tmdb:223749:6:0', 'tmdb:0:1:1',
        'foo:tt123:6:1', 'tmdb:223749:6:1:2', 'tmdb:223749:-1:1', 'tt123:1:9007199254740992', undefined]) {
        assert.equal(parseStreamId('series', id), null, String(id))
    }
    assert.equal(parseStreamId('movie', 'tt123:1:1'), null)
    assert.equal(parseStreamId('other', 'tt123'), null)
})
