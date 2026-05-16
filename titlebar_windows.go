//go:build windows

package main

import (
	"syscall"
	"unsafe"

	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/events"
)

// Win32 constants
const (
	_WM_NCCALCSIZE = 0x0083
	_WM_NCHITTEST  = 0x0084

	_HTCLIENT      = 1
	_HTCAPTION     = 2
	_HTTOP         = 12
	_HTTOPLEFT     = 13
	_HTTOPRIGHT    = 14
	_HTLEFT        = 10
	_HTRIGHT       = 11
	_HTBOTTOM      = 15
	_HTBOTTOMLEFT  = 16
	_HTBOTTOMRIGHT = 17
	_HTMINBUTTON   = 8
	_HTMAXBUTTON   = 9
	_HTCLOSE       = 20

	// ^uintptr(N) = -(N+1) in two's complement, safe on both 32/64-bit.
	_GWLP_WNDPROC = ^uintptr(3)  // -4  = GWLP_WNDPROC
	_GWL_STYLE    = ^uintptr(15) // -16 = GWL_STYLE

	_WS_MAXIMIZE = uintptr(0x01000000)

	// OperatorStrip height in CSS (device-independent) pixels.
	// At any DPI, CSS px × scale = physical px → constant in CSS px.
	_titleBarCSSpx = 38

	// Standard Windows caption button width in CSS px (46px at 96 DPI,
	// scales with DPI so stays 46 CSS px regardless of DPI setting).
	_btnCSSpx = 46

	// Width of the "Operators" label zone treated as HTCAPTION (drag handle).
	_dragZoneCSSpx = 90
)

var (
	_user32 = syscall.NewLazyDLL("user32.dll")
	_dwmapi = syscall.NewLazyDLL("dwmapi.dll")

	_SetWindowLongPtrW            = _user32.NewProc("SetWindowLongPtrW")
	_GetWindowLongPtrW            = _user32.NewProc("GetWindowLongPtrW")
	_CallWindowProcW              = _user32.NewProc("CallWindowProcW")
	_GetWindowRect                = _user32.NewProc("GetWindowRect")
	_GetCursorPos                 = _user32.NewProc("GetCursorPos")
	_GetDpiForWindow              = _user32.NewProc("GetDpiForWindow")
	_SetWindowPos                 = _user32.NewProc("SetWindowPos")
	_DwmExtendFrameIntoClientArea = _dwmapi.NewProc("DwmExtendFrameIntoClientArea")
)

type _rect    struct{ Left, Top, Right, Bottom int32 }
type _point   struct{ X, Y int32 }
type _margins struct{ Left, Right, Top, Bottom int32 }

var _origWndProc uintptr

func kyaWndProc(hwnd, msg, wParam, lParam uintptr) uintptr {
	switch msg {

	case _WM_NCCALCSIZE:
		if wParam != 0 {
			// Extend client area to cover the full window rect.
			// DWM still composites caption buttons on top.
			return 0
		}

	case _WM_NCHITTEST:
		var wr _rect
		_GetWindowRect.Call(hwnd, uintptr(unsafe.Pointer(&wr)))

		var cp _point
		_GetCursorPos.Call(uintptr(unsafe.Pointer(&cp)))

		dpi, _, _ := _GetDpiForWindow.Call(hwnd)
		scale := float64(dpi) / 96.0

		x := cp.X - wr.Left
		y := cp.Y - wr.Top
		w := wr.Right - wr.Left
		h := wr.Bottom - wr.Top

		style, _, _ := _GetWindowLongPtrW.Call(hwnd, _GWL_STYLE)
		resize := int32(8 * scale)
		if style&_WS_MAXIMIZE != 0 {
			resize = 0 // no resize border when maximised
		}

		// ── Resize border hit-tests ──────────────────────────────────────────
		switch {
		case y < resize && x < resize:
			return _HTTOPLEFT
		case y < resize && x >= w-resize:
			return _HTTOPRIGHT
		case y >= h-resize && x < resize:
			return _HTBOTTOMLEFT
		case y >= h-resize && x >= w-resize:
			return _HTBOTTOMRIGHT
		case y < resize:
			return _HTTOP
		case y >= h-resize:
			return _HTBOTTOM
		case x < resize:
			return _HTLEFT
		case x >= w-resize:
			return _HTRIGHT
		}

		// ── Below title bar → web content ────────────────────────────────────
		if y >= int32(_titleBarCSSpx*scale) {
			return _HTCLIENT
		}

		// ── Caption buttons (top-right corner) ───────────────────────────────
		bw := int32(_btnCSSpx * scale)
		switch {
		case x >= w-bw:
			return _HTCLOSE
		case x >= w-2*bw:
			return _HTMAXBUTTON // Snap Layouts triggers here
		case x >= w-3*bw:
			return _HTMINBUTTON
		}

		// ── Left "Operators" label zone = window drag handle ─────────────────
		if x < int32(_dragZoneCSSpx*scale) {
			return _HTCAPTION
		}

		// Operator tabs and buttons → let WebView2 handle input
		return _HTCLIENT
	}

	r, _, _ := _CallWindowProcW.Call(_origWndProc, hwnd, msg, wParam, lParam)
	return r
}

// installTitleExtension subclasses the WebView2 window on first show to:
//   - extend the client area into the title bar (WM_NCCALCSIZE → 0),
//   - keep resize borders and DWM caption buttons via WM_NCHITTEST.
func installTitleExtension(win *application.WebviewWindow) {
	win.OnWindowEvent(events.Common.WindowShow, func(_ *application.WindowEvent) {
		hwnd := uintptr(win.NativeWindow())

		// Subclass before triggering frame change.
		cb := syscall.NewCallback(kyaWndProc)
		_origWndProc, _, _ = _SetWindowLongPtrW.Call(hwnd, _GWLP_WNDPROC, cb)

		// 1 px top DWM margin keeps rounded corners + drop shadow.
		m := _margins{0, 0, 1, 0}
		_DwmExtendFrameIntoClientArea.Call(hwnd, uintptr(unsafe.Pointer(&m)))

		// Trigger WM_NCCALCSIZE so the client area is recalculated now.
		const (
			swpNOMOVE      = 0x0002
			swpNOSIZE      = 0x0001
			swpNOZORDER    = 0x0004
			swpNOACTIVATE  = 0x0010
			swpFRAMECHANGED = 0x0020
		)
		_SetWindowPos.Call(hwnd, 0, 0, 0, 0, 0,
			swpFRAMECHANGED|swpNOMOVE|swpNOSIZE|swpNOZORDER|swpNOACTIVATE)
	})
}
