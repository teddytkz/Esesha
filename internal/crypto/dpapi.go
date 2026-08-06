package crypto

import (
	"encoding/base64"
	"fmt"
	"syscall"
	"unsafe"
)

var (
	dllcrypt32  = syscall.NewLazyDLL("Crypt32.dll")
	dllkernel32 = syscall.NewLazyDLL("Kernel32.dll")

	procEncryptData = dllcrypt32.NewProc("CryptProtectData")
	procDecryptData = dllcrypt32.NewProc("CryptUnprotectData")
	procLocalFree   = dllkernel32.NewProc("LocalFree")
)

type dataBlob struct {
	cbData uint32
	pbData *byte
}

func newBlob(d []byte) *dataBlob {
	if len(d) == 0 {
		return &dataBlob{}
	}
	return &dataBlob{
		pbData: &d[0],
		cbData: uint32(len(d)),
	}
}

func (b *dataBlob) toByteArray() []byte {
	d := make([]byte, b.cbData)
	copy(d, unsafe.Slice(b.pbData, b.cbData))
	return d
}

// Encrypt encrypts data using Windows DPAPI (CurrentUser scope)
func Encrypt(data []byte) ([]byte, error) {
	var outblob dataBlob
	r, _, err := procEncryptData.Call(
		uintptr(unsafe.Pointer(newBlob(data))),
		0,
		0,
		0,
		0,
		0,
		uintptr(unsafe.Pointer(&outblob)),
	)
	if r == 0 {
		return nil, fmt.Errorf("encryption failed: %v", err)
	}
	defer procLocalFree.Call(uintptr(unsafe.Pointer(outblob.pbData)))
	return outblob.toByteArray(), nil
}

// Decrypt decrypts data using Windows DPAPI
func Decrypt(data []byte) ([]byte, error) {
	var outblob dataBlob
	r, _, err := procDecryptData.Call(
		uintptr(unsafe.Pointer(newBlob(data))),
		0,
		0,
		0,
		0,
		0,
		uintptr(unsafe.Pointer(&outblob)),
	)
	if r == 0 {
		return nil, fmt.Errorf("decryption failed: %v", err)
	}
	defer procLocalFree.Call(uintptr(unsafe.Pointer(outblob.pbData)))
	return outblob.toByteArray(), nil
}

// EncryptString encrypts a string and returns base64 encoded result
func EncryptString(plaintext string) (string, error) {
	encrypted, err := Encrypt([]byte(plaintext))
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(encrypted), nil
}

// DecryptString decrypts base64 encoded data and returns plaintext
func DecryptString(encoded string) (string, error) {
	data, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return "", err
	}
	decrypted, err := Decrypt(data)
	if err != nil {
		return "", err
	}
	return string(decrypted), nil
}
