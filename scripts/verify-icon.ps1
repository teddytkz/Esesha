Add-Type -AssemblyName System.Drawing
$i = [System.Drawing.Icon]::ExtractAssociatedIcon('D:\1.Project\esesha\build\bin\esesha.exe')
$b = $i.ToBitmap()
$b.Save('D:\1.Project\esesha\scripts\exe-check.png', [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host ('Extracted ' + $b.Width + 'x' + $b.Height)
