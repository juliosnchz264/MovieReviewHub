package com.moviereviewhub;

import org.springframework.boot.SpringApplication;

public class TestMoviereviewhubApplication {

	public static void main(String[] args) {
		SpringApplication.from(MoviereviewhubApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
