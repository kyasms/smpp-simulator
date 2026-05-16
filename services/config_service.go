package services

import (
	"context"
	"encoding/json"
	"fmt"
	"kyasmpp/smsc"
	"os"
	"path/filepath"

	"github.com/wailsapp/wails/v3/pkg/application"
)

// ConfigService gère la persistance par opérateur de la configuration.
// Chaque opérateur (onglet) possède sa propre Config, persistée dans son entrée OperatorService.
type ConfigService struct {
	appDir   string
	smppSvc  *SmppService
	opSvc    *OperatorService
}

func NewConfigService(smppSvc *SmppService, opSvc *OperatorService) *ConfigService {
	return &ConfigService{smppSvc: smppSvc, opSvc: opSvc}
}

// ServiceStartup hydrate les configs en mémoire et migre l'ancien config.json global
// (si présent) vers les opérateurs sans config.
func (c *ConfigService) ServiceStartup(_ context.Context, _ application.ServiceOptions) error {
	dir, err := os.UserConfigDir()
	if err != nil {
		dir = os.TempDir()
	}
	c.appDir = filepath.Join(dir, "KyaSmppSimulator")
	os.MkdirAll(c.appDir, 0755)

	legacy := c.legacyConfig()

	ops, _ := c.opSvc.GetOperators()
	for _, op := range ops {
		cfg := op.Config
		if isEmptyConfig(cfg) {
			if legacy != nil {
				cfg = *legacy
			} else {
				cfg = smsc.DefaultConfig()
			}
			op.Config = cfg
			c.opSvc.SaveOperator(op)
		}
		c.smppSvc.UpdateOperatorConfig(op.ID, cfg)
	}

	if legacy != nil {
		// Once migrated, rename the legacy file to mark it consumed.
		_ = os.Rename(filepath.Join(c.appDir, "config.json"), filepath.Join(c.appDir, "config.json.migrated"))
	}
	return nil
}

// ---- API publique -----------------------------------------------------------

func (c *ConfigService) GetConfig(operatorId string) smsc.Config {
	if op, ok := c.opSvc.GetOperator(operatorId); ok && !isEmptyConfig(op.Config) {
		return op.Config
	}
	return c.smppSvc.GetOperatorConfig(operatorId)
}

func (c *ConfigService) SaveConfig(operatorId string, cfg smsc.Config) error {
	op, ok := c.opSvc.GetOperator(operatorId)
	if !ok {
		return fmt.Errorf("operator %s not found", operatorId)
	}
	op.Config = cfg
	if err := c.opSvc.SaveOperator(op); err != nil {
		return err
	}
	c.smppSvc.UpdateOperatorConfig(operatorId, cfg)
	return nil
}

func (c *ConfigService) ResetConfig(operatorId string) (smsc.Config, error) {
	cfg := smsc.DefaultConfig()
	return cfg, c.SaveConfig(operatorId, cfg)
}

func (c *ConfigService) GetAutoMessages(operatorId string) []smsc.AutoMessage {
	cfg := c.GetConfig(operatorId)
	if cfg.AutoMessages == nil {
		return []smsc.AutoMessage{}
	}
	return cfg.AutoMessages
}

func (c *ConfigService) SaveAutoMessages(operatorId string, msgs []smsc.AutoMessage) error {
	cfg := c.GetConfig(operatorId)
	cfg.AutoMessages = msgs
	return c.SaveConfig(operatorId, cfg)
}

func (c *ConfigService) AddAutoMessage(operatorId string, msg smsc.AutoMessage) error {
	cfg := c.GetConfig(operatorId)
	cfg.AutoMessages = append(cfg.AutoMessages, msg)
	return c.SaveConfig(operatorId, cfg)
}

func (c *ConfigService) DeleteAutoMessage(operatorId string, index int) error {
	cfg := c.GetConfig(operatorId)
	if index < 0 || index >= len(cfg.AutoMessages) {
		return fmt.Errorf("auto-message index %d out of range", index)
	}
	cfg.AutoMessages = append(cfg.AutoMessages[:index], cfg.AutoMessages[index+1:]...)
	return c.SaveConfig(operatorId, cfg)
}

func (c *ConfigService) GetMessageErrorRates(operatorId string) []smsc.MessageErrorRate {
	cfg := c.GetConfig(operatorId)
	if cfg.MessageErrorRates == nil {
		return []smsc.MessageErrorRate{}
	}
	return cfg.MessageErrorRates
}

func (c *ConfigService) SaveMessageErrorRates(operatorId string, rates []smsc.MessageErrorRate) error {
	cfg := c.GetConfig(operatorId)
	cfg.MessageErrorRates = rates
	return c.SaveConfig(operatorId, cfg)
}

func (c *ConfigService) GetDeliveryErrorRates(operatorId string) []smsc.DeliveryErrorRate {
	cfg := c.GetConfig(operatorId)
	if cfg.DeliveryErrorRates == nil {
		return []smsc.DeliveryErrorRate{}
	}
	return cfg.DeliveryErrorRates
}

func (c *ConfigService) SaveDeliveryErrorRates(operatorId string, rates []smsc.DeliveryErrorRate) error {
	cfg := c.GetConfig(operatorId)
	cfg.DeliveryErrorRates = rates
	return c.SaveConfig(operatorId, cfg)
}

// ---- interne ----------------------------------------------------------------

func (c *ConfigService) legacyConfig() *smsc.Config {
	data, err := os.ReadFile(filepath.Join(c.appDir, "config.json"))
	if err != nil {
		return nil
	}
	var cfg smsc.Config
	if err := json.Unmarshal(data, &cfg); err != nil {
		return nil
	}
	return &cfg
}

// isEmptyConfig returns true if the operator has no persisted config yet (zero value).
func isEmptyConfig(cfg smsc.Config) bool {
	return cfg.Port == 0 && cfg.SystemID == "" && cfg.Password == "" && cfg.PDUTimeoutMs == 0 && cfg.EnquireIntervalMs == 0
}
