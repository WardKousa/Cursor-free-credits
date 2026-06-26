package com.example.cusforfreecredits;

import io.fluxzero.idp.testsupport.localstub.FluxzeroIdpStub;
import io.fluxzero.proxy.ProxyServer;
import io.fluxzero.sdk.configuration.ApplicationProperties;
import io.fluxzero.testserver.TestServer;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Import;

import java.io.IOException;
import java.net.ServerSocket;

import static io.fluxzero.sdk.configuration.ApplicationProperties.getProperty;

@SpringBootApplication
@Import(FluxzeroIdpStub.class)
@Slf4j
public class TestApp {
    public static void main(String[] args) {
        com.example.cusforfreecredits.config.EnvLoader.loadDefault();
        // start Flux Test Server
        System.setProperty("FLUX_PORT", getProperty("FLUX_PORT", "8888"));
        int fluxPort = ApplicationProperties.getIntegerProperty("FLUX_PORT");
        System.setProperty("FLUX_BASE_URL", "ws://localhost:" + fluxPort);
        if (availablePort(fluxPort)) {
            TestServer.startServer();
        }

        // start Flux Proxy
        System.setProperty("PROXY_PORT", getProperty("PROXY_PORT", "8080"));
        int proxyPort = ApplicationProperties.getIntegerProperty("PROXY_PORT");
        if (availablePort(proxyPort)) {
            ProxyServer.start();
        }

        // start application
        System.setProperty("FLUX_APPLICATION_NAME", getProperty("FLUX_APPLICATION_NAME", "Example"));
        SpringApplication app = new SpringApplication(TestApp.class);
        app.setAdditionalProfiles("main");
        app.run(args);

        // initialize
        initializeApp();
        String localIdpIssuer = FluxzeroIdpStub.currentIssuer().orElse("not initialized");
        log.info("Application started successfully. Visit at: http://localhost:8080/ (local IDP: {})",
                localIdpIssuer);
    }

    static void initializeApp() {
        //initialize the test application using commands etc
    }

    static boolean availablePort(int port) {
        try (ServerSocket serverSocket = new ServerSocket(port)) {
            serverSocket.setReuseAddress(true);
            return true;
        } catch (IOException e) {
            return false;
        }
    }
}
