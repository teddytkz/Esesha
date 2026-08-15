# Key File Management

## Overview

Esesha secara otomatis mengelola file private key SSH dengan menyalin dan menyimpannya di folder `keys/` di lokasi executable. Fitur ini memastikan semua credential terpusat dan mudah di-backup.

## Features

### Automatic Key Copying

Ketika Anda memilih file private key untuk connection:

1. File divalidasi sebagai SSH private key yang valid
2. File disalin ke folder `keys/` di direktori executable
3. Path yang disimpan di connection adalah path ke file yang telah disalin
4. Content file di-enkripsi menggunakan DPAPI sebelum disimpan di database

### Duplicate Handling

Jika file dengan nama yang sama sudah ada di folder `keys/`:

- Sistem menambahkan timestamp ke nama file
- Format: `{original-name}-{timestamp}.{extension}`
- Contoh: `id_rsa-20260815-112130`

### Key Backup

Saat melakukan backup connections:

1. File backup JSON dibuat dengan format: `esesha-backup-YYYYMMDD-HHMMSS.json`
2. Folder `keys/` di-backup dengan format: `keys-YYYYMMDD-HHMMSS/`
3. Semua file key disalin ke folder backup tersebut

## Directory Structure

```
executable-directory/
├── esesha.exe
├── esesha.bin              # Encrypted connections database
├── keys/                   # Private key storage
│   ├── id_rsa
│   ├── id_ecdsa
│   └── production-key.pem
└── backup/                 # Backup directory
    ├── esesha-backup-20260815-112130.json
    ├── keys-20260815-112130/
    │   ├── id_rsa
    │   ├── id_ecdsa
    │   └── production-key.pem
    ├── esesha-backup-20260815-143000.json
    └── keys-20260815-143000/
        └── ...
```

## Security

### Local Storage

- Keys disimpan di folder `keys/` dengan permissions 0700 (owner only)
- Individual key files memiliki permissions 0600 (owner read/write only)
- Folder keys berada di lokasi yang sama dengan executable untuk portability

### Encryption

- Content key tetap di-enkripsi dengan DPAPI di database
- DPAPI encryption machine-bound (tidak bisa dipindah ke komputer lain)
- File di folder `keys/` adalah plain text untuk kompatibilitas dengan SSH clients

### Backup Security

- Backup JSON berisi plaintext password untuk portability
- Backup keys folder berisi plain text key files
- **PENTING:** Backup folder harus diamankan dengan proper access controls
- Jangan share backup ke public repositories atau unsecured storage

## Usage

### Adding Connection with Key File

1. Buka dialog "Add Connection"
2. Klik "Select Private Key"
3. Pilih file private key dari sistem Anda
4. File akan otomatis disalin ke folder `keys/`
5. Connection akan menggunakan file dari folder `keys/`

### Backing Up

1. Klik menu "Backup"
2. Sistem membuat backup JSON dan folder keys
3. Backup disimpan di folder `backup/` dengan timestamp

### Restoring

1. Klik menu "Restore"
2. Pilih file backup JSON
3. **Manual:** Copy folder `keys-{timestamp}/` ke `keys/` jika diperlukan
4. Connections akan ter-restore dengan path ke folder `keys/`

## Best Practices

### Development

- Gunakan file key yang berbeda untuk development dan production
- Simpan backup di secure location (encrypted drive, password manager)

### Production

- Backup reguler (automated script recommended)
- Store backups di secure, encrypted storage
- Test restore process secara berkala
- Gunakan proper file permissions di server

### Key Rotation

1. Generate new key pair
2. Update server dengan public key baru
3. Add new connection atau update existing connection
4. Test connection dengan key baru
5. Backup setelah update
6. Hapus old key setelah confirmed working

## Troubleshooting

### Key File Not Found

**Problem:** Connection gagal karena key file tidak ditemukan

**Solution:**
1. Cek apakah folder `keys/` ada di direktori executable
2. Cek apakah file key ada di folder `keys/`
3. Restore dari backup jika diperlukan

### Permission Denied

**Problem:** Tidak bisa membaca key file

**Solution:**
1. Cek file permissions (harus 0600 atau lebih permissive)
2. Pastikan user memiliki read access ke folder `keys/`
3. Run executable dengan proper user permissions

### Backup Folder Too Large

**Problem:** Backup folder terlalu besar dengan banyak key copies

**Solution:**
1. Hapus backup lama yang tidak diperlukan
2. Pertimbangkan external backup solution
3. Implement backup rotation policy (keep last N backups)

## Implementation Details

### Functions

#### `copyKeyToKeysFolder(originalPath, content)`

- Copy file ke folder `keys/` di executable directory
- Handle duplicate names dengan timestamp suffix
- Return path ke copied file

#### `copyDirectory(src, dst)`

- Recursively copy directory dan contents
- Preserve file permissions
- Used untuk backup keys folder

#### `SelectPrivateKeyFile()`

- Open file dialog
- Validate SSH key format
- Encrypt content dengan DPAPI
- Copy file ke keys folder
- Return path dan encrypted content

#### `BackupConnections()`

- Export connections ke JSON
- Backup keys folder dengan timestamp
- Create backup directory structure

## Future Enhancements

### Potential Improvements

1. **Key Usage Tracking:** Track which connections use which keys
2. **Orphan Key Detection:** Identify keys tidak digunakan oleh connection manapun
3. **Key Validation:** Periodic validation key masih valid
4. **Backup Rotation:** Automatic cleanup old backups
5. **Cloud Backup:** Optional cloud storage integration
6. **Key Import:** Bulk import keys dari folder lain
7. **Key Metadata:** Store notes, expiry dates, key purpose

### Security Enhancements

1. **Passphrase Protection:** Add master password untuk backup
2. **Key Expiry:** Warning untuk keys yang mendekati expiry
3. **Access Logging:** Log kapan key digunakan
4. **Two-Factor:** Require 2FA untuk access sensitive keys

## See Also

- [Secure Key Storage](secure-key-storage.md)
- [PPK Converter Guide](../guides/ppk-converter.md)
- [Backup & Restore](../user-guide/backup-restore.md)
- [PEM Encryption](../technical/pem-encryption.md)
