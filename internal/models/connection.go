package models

type Connection struct {
	ID                int    `json:"id"`
	Name              string `json:"name"`
	Host              string `json:"host"`
	Port              int    `json:"port"`
	Username          string `json:"username"`
	EncryptedPassword []byte `json:"encrypted_password"`
	PrivateKeyPath    string `json:"privateKeyPath"`
	CreatedAt         int64  `json:"createdAt"`
	UpdatedAt         int64  `json:"updatedAt"`
}
