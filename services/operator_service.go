package services

import (
	"context"
	"encoding/json"
	"kyasmpp/smsc"
	"os"
	"path/filepath"

	"github.com/wailsapp/wails/v3/pkg/application"
	bolt "go.etcd.io/bbolt"
)

var bucketOperators = []byte("operators")
var orderKey = []byte("__order__")

// Operator is the persisted operator configuration.
type Operator struct {
	ID     string      `json:"id"`
	Name   string      `json:"name"`
	Port   int         `json:"port"`
	Config smsc.Config `json:"config"`
}

// OperatorService persists operator configs in a bbolt database.
type OperatorService struct {
	db *bolt.DB
}

func NewOperatorService() *OperatorService {
	return &OperatorService{}
}

func (s *OperatorService) ServiceStartup(_ context.Context, _ application.ServiceOptions) error {
	dir, err := os.UserConfigDir()
	if err != nil {
		dir = os.TempDir()
	}
	appDir := filepath.Join(dir, "KyaSmppSimulator")
	os.MkdirAll(appDir, 0755)

	db, err := bolt.Open(filepath.Join(appDir, "operators.db"), 0600, nil)
	if err != nil {
		return err
	}
	s.db = db

	return db.Update(func(tx *bolt.Tx) error {
		_, err := tx.CreateBucketIfNotExists(bucketOperators)
		return err
	})
}

func (s *OperatorService) ServiceShutdown() error {
	if s.db != nil {
		return s.db.Close()
	}
	return nil
}

// ---- API publique -----------------------------------------------------------

func (s *OperatorService) GetOperators() ([]Operator, error) {
	opsMap := map[string]Operator{}
	var order []string

	err := s.db.View(func(tx *bolt.Tx) error {
		b := tx.Bucket(bucketOperators)
		if raw := b.Get(orderKey); raw != nil {
			json.Unmarshal(raw, &order)
		}
		return b.ForEach(func(k, v []byte) error {
			if string(k) == "__order__" {
				return nil
			}
			var op Operator
			if err := json.Unmarshal(v, &op); err == nil {
				opsMap[op.ID] = op
			}
			return nil
		})
	})
	if err != nil {
		return nil, err
	}

	var ops []Operator
	seen := map[string]bool{}
	for _, id := range order {
		if op, ok := opsMap[id]; ok {
			ops = append(ops, op)
			seen[id] = true
		}
	}
	for id, op := range opsMap {
		if !seen[id] {
			ops = append(ops, op)
		}
	}
	return ops, nil
}

func (s *OperatorService) SaveOrder(ids []string) error {
	data, err := json.Marshal(ids)
	if err != nil {
		return err
	}
	return s.db.Update(func(tx *bolt.Tx) error {
		return tx.Bucket(bucketOperators).Put(orderKey, data)
	})
}

func (s *OperatorService) SaveOperator(op Operator) error {
	data, err := json.Marshal(op)
	if err != nil {
		return err
	}
	return s.db.Update(func(tx *bolt.Tx) error {
		return tx.Bucket(bucketOperators).Put([]byte(op.ID), data)
	})
}

func (s *OperatorService) DeleteOperator(id string) error {
	return s.db.Update(func(tx *bolt.Tx) error {
		return tx.Bucket(bucketOperators).Delete([]byte(id))
	})
}

// GetOperator returns a single operator by id.
func (s *OperatorService) GetOperator(id string) (Operator, bool) {
	var op Operator
	var found bool
	s.db.View(func(tx *bolt.Tx) error {
		raw := tx.Bucket(bucketOperators).Get([]byte(id))
		if raw == nil {
			return nil
		}
		if err := json.Unmarshal(raw, &op); err == nil {
			found = true
		}
		return nil
	})
	return op, found
}
