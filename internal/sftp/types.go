package sftp

// FileInfo represents remote file metadata
type FileInfo struct {
	Name         string `json:"name"`
	Size         int64  `json:"size"`
	Mode         uint32 `json:"mode"`
	ModifiedTime int64  `json:"modifiedTime"`
	IsDir        bool   `json:"isDir"`
	Path         string `json:"path"`
}

// TransferProgress represents upload/download progress
type TransferProgress struct {
	SessionID    string  `json:"sessionId"`
	Operation    string  `json:"operation"` // "upload" or "download"
	RemotePath   string  `json:"remotePath"`
	LocalPath    string  `json:"localPath"`
	BytesTotal   int64   `json:"bytesTotal"`
	BytesCurrent int64   `json:"bytesCurrent"`
	Percentage   float64 `json:"percentage"`
	Completed    bool    `json:"completed"`
	Error        string  `json:"error,omitempty"`
}
