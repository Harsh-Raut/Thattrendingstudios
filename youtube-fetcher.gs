/**
 * That Trending Studio — YouTube fetcher (Google Apps Script)
 * ----------------------------------------------------------------
 * Serves the channel's latest releases + the NEXT upcoming song to the website
 * as JSONP.
 *
 * Uses the YouTube ADVANCED SERVICE (OAuth, runs as you) instead of an API key,
 * so it can also see videos that are SCHEDULED in YouTube Studio — those are
 * PRIVATE until their publish time and are invisible to an API key.
 *
 * SETUP (once):
 *  1. Open this Apps Script project. In the left sidebar click "Services" (+),
 *     choose "YouTube Data API v3", keep the identifier "YouTube", click Add.
 *  2. Make sure you are signed in with the Google account that OWNS/MANAGES
 *     the @thattrendingsong channel (otherwise it can't see private uploads).
 *  3. Save → Deploy → Manage deployments → ✏️ edit → Version: New version → Deploy.
 *     Re-authorize when prompted (it now needs YouTube read access).
 *
 * Test:  <your /exec URL>?fresh=1        (fresh=1 skips the 15-min cache)
 */

var CHANNEL_HANDLE = 'thattrendingsong';   // without the @
var CACHE_SECONDS = 900;                   // 15 min

function doGet(e) {
  var cb = (e && e.parameter && e.parameter.callback) ? e.parameter.callback : '';
  var fresh = !!(e && e.parameter && e.parameter.fresh);
  var body = JSON.stringify(getData(fresh));
  if (cb) {
    return ContentService.createTextOutput(cb + '(' + body + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}

function getData(bypassCache) {
  var cache = CacheService.getScriptCache();
  if (!bypassCache) {
    var hit = cache.get('yt2');
    if (hit) return JSON.parse(hit);
  }

  var out = { latest: null, previous: null, upcoming: null, error: null };
  try {
    // resolve the uploads playlist (try the handle, fall back to the signed-in channel)
    var ch = YouTube.Channels.list('contentDetails,id', { forHandle: CHANNEL_HANDLE });
    if (!ch.items || !ch.items.length) {
      ch = YouTube.Channels.list('contentDetails,id', { mine: true });
    }
    var uploads = ch.items[0].contentDetails.relatedPlaylists.uploads;

    // as the owner, this playlist also contains private/scheduled uploads
    var pl = YouTube.PlaylistItems.list('snippet', { playlistId: uploads, maxResults: 25 });
    var ids = (pl.items || []).map(function (it) { return it.snippet.resourceId.videoId; });
    if (!ids.length) throw new Error('No uploads found');

    var det = YouTube.Videos.list('snippet,status,liveStreamingDetails',
      { id: ids.join(','), maxResults: 50 });

    var now = new Date().getTime();
    var published = [], upcoming = [];

    (det.items || []).forEach(function (v) {
      var raw = v.snippet.title;
      var item = { id: v.id, title: cleanTitle(raw), thumb: bestThumb(v.snippet.thumbnails) };
      var privacy = v.status ? v.status.privacyStatus : 'public';
      var publishAt = v.status ? v.status.publishAt : null;                                  // scheduled upload
      var premiereAt = v.liveStreamingDetails ? v.liveStreamingDetails.scheduledStartTime : null; // Premiere
      var when = premiereAt || publishAt;

      if (when && new Date(when).getTime() > now) {
        item.premiereAt = when;
        item.isPremiere = !!premiereAt;   // false = plain scheduled upload (still private)
        upcoming.push(item);
      } else if (privacy === 'public' && isSong(raw)) {
        item.date = v.snippet.publishedAt;
        published.push(item);
      }
    });

    published.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
    upcoming.sort(function (a, b) { return new Date(a.premiereAt) - new Date(b.premiereAt); });

    out.latest = published[0] || null;
    out.previous = published[1] || null;
    out.upcoming = upcoming[0] || null;   // soonest upcoming release
  } catch (err) {
    out.error = String(err);
  }

  cache.put('yt2', JSON.stringify(out), CACHE_SECONDS);
  return out;
}

function bestThumb(t) {
  if (!t) return '';
  var x = t.maxres || t.standard || t.high || t.medium || t['default'];
  return x ? x.url : '';
}

// true for real song releases, false for BTS / teasers / shorts / etc.
function isSong(title) {
  return !/\b(bts|behind\s*the\s*scenes|teaser|trailer|promo|snippet|reaction|vlog|making|cover|shorts|live)\b|#shorts/i.test(title);
}

// "Gauri – Bas Tu Hi (बस तू ही) | Official Music Video | Unkaha" -> "Bas Tu Hi (बस तू ही)"
function cleanTitle(title) {
  var s = title.split('|')[0].trim();
  s = s.replace(/^\s*gauri\s*[–\-:]\s*/i, '');
  return s || title;
}
