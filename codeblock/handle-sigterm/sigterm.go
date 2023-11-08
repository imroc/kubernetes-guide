package main

import (
	"fmt"
	"os"
	"os/signal"
	"syscall"
)

func main() {
	sigs := make(chan os.Signal, 1)
	done := make(chan bool, 1)
	// registers the channel
	signal.Notify(sigs, syscall.SIGTERM)

	go func() {
		sig := <-sigs
		fmt.Println("Caught SIGTERM, shutting down")
		// Finish any outstanding requests, then...
		done <- true
	}()

	fmt.Println("Starting application")
	// Main logic goes here
	<-done
	fmt.Println("exiting")
}
