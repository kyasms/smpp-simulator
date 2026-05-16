//go:build windows

package smsc

import (
	"context"
	"net"
	"syscall"
)

const (
	_SOL_SOCKET          = 0xffff
	_SO_EXCLUSIVEADDRUSE = ^int(0x0004) // ~SO_REUSEADDR = -5
)

func newListener(addr string) (net.Listener, error) {
	lc := net.ListenConfig{
		Control: func(_, _ string, c syscall.RawConn) error {
			var innerErr error
			err := c.Control(func(fd uintptr) {
				innerErr = syscall.SetsockoptInt(syscall.Handle(fd), _SOL_SOCKET, _SO_EXCLUSIVEADDRUSE, 1)
			})
			if err != nil {
				return err
			}
			return innerErr
		},
	}
	return lc.Listen(context.Background(), "tcp", addr)
}
