param(
  [string]$Source, [string]$Output,
  [double]$Scale = 0.474,      # canvas pixels per source pixel
  [double]$CenterX = 473,      # source x that lands on the doll's center line
  [int]$TopY = 510,            # canvas y for the top of the item
  [int]$Threshold = 232        # brighter than this, connected to the edge, is background
)
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System; using System.Collections.Generic; using System.Drawing; using System.Drawing.Imaging; using System.Runtime.InteropServices;
public static class Cutout {
  public static Bitmap Run(string path, int threshold, out int top, out int bottom) {
    Bitmap src = new Bitmap(path);
    Bitmap bmp = new Bitmap(src.Width, src.Height, PixelFormat.Format32bppArgb);
    using (Graphics g = Graphics.FromImage(bmp)) g.DrawImage(src, 0, 0, src.Width, src.Height);
    src.Dispose();
    int w = bmp.Width, h = bmp.Height;
    BitmapData data = bmp.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
    byte[] px = new byte[w * h * 4];
    Marshal.Copy(data.Scan0, px, 0, px.Length);
    Func<int, int> min = i => Math.Min(px[i * 4], Math.Min(px[i * 4 + 1], px[i * 4 + 2]));
    bool[] bg = new bool[w * h];
    Queue<int> q = new Queue<int>();
    Action<int> visit = i => { if (!bg[i] && min(i) >= threshold) { bg[i] = true; q.Enqueue(i); } };
    for (int x = 0; x < w; x++) { visit(x); visit((h - 1) * w + x); }
    for (int y = 0; y < h; y++) { visit(y * w); visit(y * w + w - 1); }
    while (q.Count > 0) {
      int i = q.Dequeue(), x = i % w, y = i / w;
      if (x > 0) visit(i - 1); if (x < w - 1) visit(i + 1); if (y > 0) visit(i - w); if (y < h - 1) visit(i + w);
    }
    // Soften the ring next to the background, so no pale fringe is left
    int[] dist = new int[w * h];
    for (int pass = 1; pass <= 3; pass++) {
      for (int y = 1; y < h - 1; y++) for (int x = 1; x < w - 1; x++) {
        int i = y * w + x;
        if (bg[i] || dist[i] != 0) continue;
        bool near = pass == 1 ? (bg[i - 1] || bg[i + 1] || bg[i - w] || bg[i + w])
          : (dist[i - 1] == pass - 1 || dist[i + 1] == pass - 1 || dist[i - w] == pass - 1 || dist[i + w] == pass - 1);
        if (near) dist[i] = pass;
      }
    }
    top = h; bottom = 0;
    for (int i = 0; i < w * h; i++) {
      if (bg[i]) { px[i * 4 + 3] = 0; continue; }
      int y = i / w; if (y < top) top = y; if (y > bottom) bottom = y;
      if (dist[i] > 0) {
        int m = min(i);
        if (m > 120) { double a = (255.0 - m) / 135.0; if (a < 0) a = 0; if (a > 1) a = 1; px[i * 4 + 3] = (byte)(255 * a); }
      }
    }
    Marshal.Copy(px, 0, data.Scan0, px.Length);
    bmp.UnlockBits(data);
    return bmp;
  }
}
'@
Add-Type -AssemblyName System.Drawing
$top = 0; $bottom = 0
$cut = [Cutout]::Run($Source, $Threshold, [ref]$top, [ref]$bottom)
$canvas = New-Object Drawing.Bitmap 720, 1272, ([Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [Drawing.Graphics]::FromImage($canvas)
$g.InterpolationMode = 'HighQualityBicubic'; $g.PixelOffsetMode = 'HighQuality'; $g.CompositingQuality = 'HighQuality'
$x = 360 - $CenterX * $Scale
$y = $TopY - $top * $Scale
$g.DrawImage($cut, [single]$x, [single]$y, [single]($cut.Width * $Scale), [single]($cut.Height * $Scale))
$g.Dispose()
$canvas.Save($Output, [Drawing.Imaging.ImageFormat]::Png)
$canvas.Dispose(); $cut.Dispose()
"item rows $top-$bottom -> canvas y $TopY-$([int]($TopY + ($bottom - $top) * $Scale)) | $([int]((Get-Item $Output).Length/1KB)) KB"
