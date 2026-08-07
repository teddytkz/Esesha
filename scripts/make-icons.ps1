Add-Type -AssemblyName System.Drawing

$src = Resolve-Path 'assets\anyaa.jpg'
$img = [System.Drawing.Image]::FromFile($src)

# build/appicon.png (512x512)
$png = New-Object System.Drawing.Bitmap 512, 512
$g = [System.Drawing.Graphics]::FromImage($png)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($img, 0, 0, 512, 512)
$png.Save('build\appicon.png', [System.Drawing.Imaging.ImageFormat]::Png)

# build/windows/icon.ico — ICO multi-size (256, 128, 64, 48, 32, 16)
function New-MultiSizeIco([System.Drawing.Bitmap]$bmp, [int[]]$sizes, [string]$outPath) {
    $pngDataList = @()
    
    foreach ($size in $sizes) {
        $resized = New-Object System.Drawing.Bitmap $size, $size
        $g = [System.Drawing.Graphics]::FromImage($resized)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.DrawImage($bmp, 0, 0, $size, $size)
        $g.Dispose()

        $ms = New-Object System.IO.MemoryStream
        $resized.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
        $pngDataList += ,@($size, $ms.ToArray())
        $ms.Dispose()
        $resized.Dispose()
    }

    # ICONDIR header
    $fs = [System.IO.File]::Create($outPath)
    $bw = New-Object System.IO.BinaryWriter($fs)
    $bw.Write([UInt16]0)              # reserved
    $bw.Write([UInt16]1)              # type: icon
    $bw.Write([UInt16]$sizes.Length)  # count

    # Calculate offsets
    $offset = 6 + (16 * $sizes.Length)
    
    # Write ICONDIRENTRY for each size
    foreach ($item in $pngDataList) {
        $size = $item[0]
        $data = $item[1]
        $dim = if ($size -eq 256) { 0 } else { $size }
        $bw.Write([Byte]$dim)         # width
        $bw.Write([Byte]$dim)         # height
        $bw.Write([Byte]0)            # color count
        $bw.Write([Byte]0)            # reserved
        $bw.Write([UInt16]1)          # planes
        $bw.Write([UInt16]32)         # bit count
        $bw.Write([UInt32]$data.Length)
        $bw.Write([UInt32]$offset)
        $offset += $data.Length
    }

    # Write PNG data
    foreach ($item in $pngDataList) {
        $bw.Write($item[1])
    }
    
    $bw.Close()
    $fs.Close()
}

New-MultiSizeIco $img @(256, 128, 64, 48, 32, 16) 'build\windows\icon.ico'

$img.Dispose(); $png.Dispose()
Write-Host 'Icons generated from assets/anya.jpg'