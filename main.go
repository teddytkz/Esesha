package main

import (
	"embed"
	"errors"
	"unsafe"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"golang.org/x/sys/windows"
)

//go:embed all:frontend/dist
var assets embed.FS

// Single-instance guard: named mutex so a second launch focuses the running app instead of opening a duplicate.
const appMutexName = `Local\esesha-single-instance`

var (
	user32                  = windows.NewLazySystemDLL("user32.dll")
	procFindWindowW         = user32.NewProc("FindWindowW")
	procShowWindow          = user32.NewProc("ShowWindow")
	procSetForegroundWindow = user32.NewProc("SetForegroundWindow")
)

func main() {
	mutex, err := windows.CreateMutex(nil, false, windows.StringToUTF16Ptr(appMutexName))
	if errors.Is(err, windows.ERROR_ALREADY_EXISTS) {
		if mutex != 0 {
			windows.CloseHandle(mutex)
		}
		focusExistingWindow()
		return
	}
	if err == nil {
		defer windows.CloseHandle(mutex)
	}

	// Create an instance of the app structure
	app := NewApp()

	// Create application with options
	err = wails.Run(&options.App{
		Title:  "esesha",
		Width:  1024,
		Height: 768,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup:        app.startup,
		OnShutdown:       app.shutdown,
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}

// focusExistingWindow brings the already-running app window to the foreground.
func focusExistingWindow() {
	title, _ := windows.UTF16PtrFromString("esesha")
	hwnd, _, _ := procFindWindowW.Call(0, uintptr(unsafe.Pointer(title)))
	if hwnd == 0 {
		return
	}
	procShowWindow.Call(hwnd, 9) // SW_RESTORE (un-minimize if needed)
	procSetForegroundWindow.Call(hwnd)
}
