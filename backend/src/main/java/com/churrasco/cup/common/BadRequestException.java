package com.churrasco.cup.common;

/** Invalid request per business rules -> HTTP 400. */
public class BadRequestException extends RuntimeException {
    public BadRequestException(String message) {
        super(message);
    }
}
