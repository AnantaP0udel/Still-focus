using System;
using System.Linq;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using Windows.Media.Control;
using Windows.Storage.Streams;

class SpotifyControl {
    static int Main(string[] args) {
        try {
            var result = Run(args.Length == 0 ? "status" : args[0]);
            
            Console.OutputEncoding = new System.Text.UTF8Encoding(false);
            Console.WriteLine(new JavaScriptSerializer().Serialize(result));
        } catch (Exception error) {
            Console.Error.WriteLine(error.GetType().Name + ": " + error.Message);
            Console.WriteLine("{\"connected\":false,\"message\":\"Windows could not access Spotify. Open Spotify, play a song, then reconnect.\"}");
        }
        return 0;
    }
    static T Wait<T>(Windows.Foundation.IAsyncOperation<T> operation) { var until=DateTime.UtcNow.AddSeconds(5); while(operation.Status == Windows.Foundation.AsyncStatus.Started) { if(DateTime.UtcNow > until) throw new Exception("Timeout"); System.Threading.Thread.Sleep(40); } return operation.GetResults(); }
    static object Run(string command) {
        if (!new[] {"status", "toggle", "next", "previous"}.Contains(command)) throw new Exception("Invalid command");
        var manager = Wait(GlobalSystemMediaTransportControlsSessionManager.RequestAsync());
        var session = manager.GetSessions().FirstOrDefault(s => s.SourceAppUserModelId.IndexOf("spotify", StringComparison.OrdinalIgnoreCase) >= 0);
        if (session == null) return new { connected = false, message = "Open Spotify and play a song once, then click Connect desktop player." };
        bool accepted = true;
        if (command == "toggle") accepted = Wait(session.TryTogglePlayPauseAsync());
        else if (command == "next") accepted = Wait(session.TrySkipNextAsync());
        else if (command == "previous") accepted = Wait(session.TrySkipPreviousAsync());
        var media = Wait(session.TryGetMediaPropertiesAsync());
        var info = session.GetPlaybackInfo();
        string artwork = "";
        try {
            if (media.Thumbnail != null) {
                var stream = Wait(media.Thumbnail.OpenReadAsync());
                if (stream.Size > 0 && stream.Size <= 262144) {
                    var reader = new DataReader(stream.GetInputStreamAt(0));
                    uint length = (uint)stream.Size;
                    Wait(reader.LoadAsync(length));
                    var bytes = new byte[length];
                    reader.ReadBytes(bytes);
                    string mime = stream.ContentType;
                    if (mime == "image/png" || mime == "image/jpeg" || mime == "image/webp") artwork = "data:" + mime + ";base64," + Convert.ToBase64String(bytes);
                    reader.Dispose();
                }
                stream.Dispose();
            }
        } catch { /* Track controls remain available when artwork is unavailable. */ }
        double positionMs = 0, durationMs = 0;
        try {
            var timeline = session.GetTimelineProperties();
            durationMs = Math.Max(0, (timeline.EndTime - timeline.StartTime).TotalMilliseconds);
            positionMs = Math.Max(0, (timeline.Position - timeline.StartTime).TotalMilliseconds);
            if (info.PlaybackStatus == GlobalSystemMediaTransportControlsSessionPlaybackStatus.Playing)
                positionMs += Math.Max(0, (DateTimeOffset.Now - timeline.LastUpdatedTime).TotalMilliseconds);
            positionMs = Math.Min(durationMs, positionMs);
        } catch { }
        return new { connected = true, accepted, title = media.Title, artist = media.Artist,
            album = media.AlbumTitle, artwork, positionMs, durationMs, updatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            playing = info.PlaybackStatus == GlobalSystemMediaTransportControlsSessionPlaybackStatus.Playing,
            message = accepted ? "" : "Spotify cannot perform that action for the current track." };
    }
}


