package main

import (
	"embed"
	"log"

	"kyasmpp/services"

	"github.com/wailsapp/wails/v3/pkg/application"
)

//go:embed all:frontend/dist
var assets embed.FS

//go:embed build/appicon.png
var appIcon []byte

func main() {
	smppSvc := services.NewSmppService()
	operatorSvc := services.NewOperatorService()
	configSvc := services.NewConfigService(smppSvc, operatorSvc)

	app := application.New(application.Options{
		Name:        "KyaSmppSimulator",
		Description: "SMPP SMSC Simulator",
		Icon:        appIcon,
		Services: []application.Service{
			application.NewService(smppSvc),
			application.NewService(operatorSvc),
			application.NewService(configSvc),
		},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
	})

	// Wire app into SmppService pour l'émission d'événements Go → React.
	smppSvc.SetApp(app)

	app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:            "kya smpp simulator",
		Width:            1280,
		Height:           820,
		MinWidth:         900,
		MinHeight:        600,
		URL:              "/",
		BackgroundColour: application.NewRGB(18, 18, 18),
	})

	if err := app.Run(); err != nil {
		log.Fatalf("application error: %v", err)
	}
}
