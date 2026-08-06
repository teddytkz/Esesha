package models

import "time"

type Connection struct {
	ID                int       `json:"id"`
	Name              string    `json:"name"`
	Host              string    `json:"host"`
	Port              int       `json:"port"`
	Username          string    `json:"username"`
	EncryptedPassword []byte    `json:"encrypted_password"`
	PrivateKeyPath    string    `json:"privateKeyPath"`
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`
}
