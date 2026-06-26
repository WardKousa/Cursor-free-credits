package com.example.cusforfreecredits;

import com.example.cusforfreecredits.config.EnvLoader;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@Slf4j
public class App {

    public static void main(String[] args) {
        EnvLoader.loadDefault();
        SpringApplication.run(App.class, args);
        log.info("Application started successfully");
    }

}
